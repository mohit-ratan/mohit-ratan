const { cheerCounts } = require('../lib/postCheers');
const { preparePostVideo } = require('../lib/postVideo');
const { currentGoalStreak, checkInGoal, goalStreakFromDays, goalStreakAwards } = require('../lib/goalStreak');
const { ensureMemberTables, recordCheckIn } = require('../lib/memberFeatures');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { canViewPost } = require('../lib/access');
const { recordTaskCheckIn, celebrationLevel } = require('../lib/taskCelebration');
const { normalizeTasks, buildFreshTaskList } = require('../lib/goalProgress');
const { canView } = require('../lib/follows');
const { notify } = require('../lib/notifications');
const { uploadMedia, deleteMedia } = require('../lib/storage');
const { checkAndAwardTrifecta, trifectaStatus, TRIFECTA_CATEGORIES } = require('../lib/trifecta');
const { ALLOWED_REACTIONS } = require('../lib/reactions');

function mediaTypeFromMime(mime) {
  return mime && mime.startsWith('video') ? 'video' : 'image';
}

function clampPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
}

// Deletes the goal for (authorId, tag) if no posts remain under that tag —
// a goal with zero posts behind it would be invisible/unmanageable, since
// achievements only ever surface tags that have at least one post.
async function deleteGoalIfOrphaned(authorId, tag) {
  if (!tag) return;
  const [remaining] = await pool.query(
    'SELECT 1 FROM posts WHERE author_id = ? AND tag = ? LIMIT 1',
    [authorId, tag]
  );
  if (!remaining.length) {
    await pool.query('DELETE FROM goal_streaks WHERE author_id = ? AND tag = ?', [authorId, tag]);
    await pool.query('DELETE FROM goals WHERE author_id = ? AND tag = ?', [authorId, tag]);
  }
}

function mapPost(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.display_name,
    authorPhotoUrl: row.author_photo,
    category: row.category,
    vibe: row.vibe,
    tag: row.tag,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    videoCoverUrl: row.video_cover_url || null,
    aiStyled: !!row.ai_styled,
    visibility: row.visibility,
    aspectRatio: row.aspect_ratio,
    cropX: row.crop_x == null ? 50 : Number(row.crop_x),
    cropY: row.crop_y == null ? 50 : Number(row.crop_y),
    createdAt: new Date(row.created_at).getTime(),
    likeCount: Number(row.like_count || 0),
    likedByMe: !!row.liked_by_me,
    commentCount: Number(row.comment_count || 0),
    myReaction: row.my_reaction || null,
  };
}

// Progress belongs to the photo's moment, rather than the goal's latest total.
function summarizeProgress(tasks) {
  return tasks.reduce((acc, task) => ({
    completed: acc.completed + task.completedDays,
    target: acc.target + task.targetDays,
  }), { completed: 0, target: 0 });
}

async function preserveGoalPhotos(db, authorId, tag, tasks) {
  const { completed, target } = summarizeProgress(tasks);
  await db.query(`INSERT IGNORE INTO post_goal_progress (post_id, completed, target)
    SELECT id, ?, ? FROM posts WHERE author_id = ? AND tag = ?`,
    [completed, target, authorId, tag]);
}

async function loadGoalStreaks(goalPairs) {
  await ensureMemberTables();
  const streaks = new Map();
  if (goalPairs.length) {
    const [rows] = await pool.query(`SELECT author_id, tag, state FROM goal_streaks WHERE (author_id, tag) IN (${goalPairs.map(() => '(?,?)').join(',')})`, goalPairs.flat());
    for (const row of rows) streaks.set(`${row.author_id}:${row.tag}`, currentGoalStreak(row.state));
    const missing = goalPairs.filter(([authorId, tag]) => !streaks.has(`${authorId}:${tag}`));
    if (missing.length) {
      const [history] = await pool.query(`SELECT ci.user_id, ci.goal_tag, ci.day_key, g.subtasks
        FROM task_checkins ci JOIN goals g ON g.author_id = ci.user_id AND g.tag = ci.goal_tag
        WHERE (ci.user_id, ci.goal_tag) IN (${missing.map(() => '(?,?)').join(',')}) ORDER BY ci.day_key`, missing.flat());
      for (const [authorId, tag] of missing) {
        const days = history.filter(row => row.user_id === authorId && row.goal_tag === tag);
        if (days.length) {
          const tasks = normalizeTasks(days[0].subtasks);
          const zone = tasks.find(task => task.streakTimeZone)?.streakTimeZone;
          streaks.set(`${authorId}:${tag}`, currentGoalStreak(goalStreakFromDays(days.map(row => row.day_key), zone)));
        }
      }
    }
  }
  return streaks;
}

async function attachGoalProgress(posts) {
  if (!posts.length) return posts;
  await ensureMemberTables();
  const [snapshots] = await pool.query(
    `SELECT post_id, completed, target FROM post_goal_progress WHERE post_id IN (${posts.map(() => '?').join(',')})`,
    posts.map(post => post.id)
  );
  const byId = new Map(snapshots.map(row => [row.post_id, { completed: row.completed, target: row.target }]));
  // Legacy photos have no recoverable historical total. Save their current
  // baseline once, before subsequent check-ins can change it.
  const pairs = [...new Map(posts.filter(post => post.tag && !byId.has(post.id))
    .map(post => [`${post.authorId}:${post.tag}`, [post.authorId, post.tag]])).values()];
  if (pairs.length) {
    const [goals] = await pool.query(
      `SELECT author_id, tag, subtasks FROM goals WHERE (author_id, tag) IN (${pairs.map(() => '(?,?)').join(',')})`, pairs.flat());
    for (const goal of goals) {
      await preserveGoalPhotos(pool, goal.author_id, goal.tag, normalizeTasks(goal.subtasks));
    }
    // Read the winning snapshot if a simultaneous upload saved it first.
    const [saved] = await pool.query(
      `SELECT post_id, completed, target FROM post_goal_progress WHERE post_id IN (${posts.map(() => '?').join(',')})`, posts.map(post => post.id));
    for (const row of saved) byId.set(row.post_id, { completed: row.completed, target: row.target });
  }
  const goalPairs = [...new Map(posts.filter(post => post.tag).map(post => [`${post.authorId}:${post.tag}`, [post.authorId, post.tag]])).values()];
  const streaks = await loadGoalStreaks(goalPairs);
  return posts.map(post => byId.has(post.id) ? { ...post, goalProgress: { ...byId.get(post.id), streak: streaks.get(`${post.authorId}:${post.tag}`) || null } } : post);
}

const PAGE_SIZE = 30;

// The "can this viewer actually see this post" rule — shared by the feed
// query and the counts/trending-tags queries below it, so a post never gets
// counted or surfaced as trending for someone who can't actually open it.
const VISIBLE_TO_VIEWER_SQL = `(p.visibility = 'public' OR p.author_id = ? OR EXISTS(
  SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = p.author_id AND f.status = 'accepted'
)) AND NOT EXISTS (
  SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = p.author_id) OR (b.blocker_id = p.author_id AND b.blocked_id = ?)
)`;

// Media-only feed — a post with no media is never created (see create() below),
// so this list is inherently "photos and videos only".
async function list(req, res) {
  try {
    const { category, tag, authorId } = req.query;
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    let sql = `SELECT p.*, u.display_name, u.photo_url as author_photo,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
               (SELECT pr.reaction FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?) as my_reaction,
               EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me
               FROM posts p JOIN users u ON u.id = p.author_id
               WHERE ${VISIBLE_TO_VIEWER_SQL}`;
    const params = [req.userId, req.userId, req.userId, req.userId, req.userId, req.userId];
    if (category && category !== 'all') {
      sql += ' AND p.category = ?';
      params.push(category);
    }
    if (tag) {
      sql += ' AND p.tag = ?';
      params.push(String(tag).toLowerCase());
    }
    if (authorId) {
      sql += ' AND p.author_id = ?';
      params.push(authorId);
    }
    sql += ' ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?';
    params.push(PAGE_SIZE + 1, offset);
    const [rows] = await pool.query(sql, params);
    const hasMore = rows.length > PAGE_SIZE;
    const posts = await attachGoalProgress(rows.slice(0, PAGE_SIZE).map(mapPost));
    const cheers = await cheerCounts(pool, posts.map(post => post.id));
    for (const post of posts) post.cheers = cheers.get(post.id) || [];
    res.json({ posts, hasMore });
  } catch (err) {
    console.error('list posts error:', err);
    res.status(500).json({ error: 'Could not load posts.' });
  }
}

// Fetch directly so notification links also work for posts beyond the feed page.
async function get(req, res) {
  try {
    if (!await canViewPost(req.userId, req.params.id)) {
      return res.status(404).json({ error: 'This post is no longer available.' });
    }
    const [rows] = await pool.query(`SELECT p.*, u.display_name, u.photo_url AS author_photo,
      (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count,
      (SELECT pr.reaction FROM post_reactions pr WHERE pr.post_id = p.id AND pr.user_id = ?) AS my_reaction,
      EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) AS liked_by_me
      FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`,
    [req.userId, req.userId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'This post is no longer available.' });
    const [post] = await attachGoalProgress([mapPost(rows[0])]);
    post.cheers = (await cheerCounts(pool, [post.id])).get(post.id) || [];
    res.json({ post });
  } catch (err) {
    console.error('get post error:', err);
    res.status(500).json({ error: 'Could not load this post.' });
  }
}

// Trending tags across recent posts (for the sidebar)
async function trendingTags(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.tag, COUNT(*) as count FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.tag IS NOT NULL AND p.tag <> '' AND ${VISIBLE_TO_VIEWER_SQL}
       GROUP BY p.tag ORDER BY count DESC LIMIT 8`,
      [req.userId, req.userId, req.userId, req.userId]
    );
    res.json({ tags: rows.map(r => ({ tag: r.tag, count: Number(r.count) })) });
  } catch (err) {
    console.error('trending tags error:', err);
    res.status(500).json({ error: 'Could not load trending tags.' });
  }
}

// Tags matching a search query (for the header search bar) — visibility
// scoped the same way as everywhere else, so a tag only shows if the
// viewer can actually see at least one post carrying it.
async function searchTags(req, res) {
  try {
    const q = (req.query.q || '').trim().replace(/^#/, '').toLowerCase().slice(0, 24);
    if (!q) return res.json({ tags: [] });
    const [rows] = await pool.query(
      `SELECT p.tag, COUNT(*) as count FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.tag LIKE ? AND ${VISIBLE_TO_VIEWER_SQL}
       GROUP BY p.tag ORDER BY count DESC LIMIT 8`,
      [`%${q}%`, req.userId, req.userId, req.userId, req.userId]
    );
    res.json({ tags: rows.map(r => ({ tag: r.tag, count: Number(r.count) })) });
  } catch (err) {
    console.error('search tags error:', err);
    res.status(500).json({ error: 'Could not search tags.' });
  }
}

async function categoryCounts(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.category, COUNT(*) as count FROM posts p JOIN users u ON u.id = p.author_id
       WHERE ${VISIBLE_TO_VIEWER_SQL}
       GROUP BY p.category`,
      [req.userId, req.userId, req.userId, req.userId]
    );
    const counts = { health: 0, wealth: 0, relationships: 0 };
    rows.forEach(r => { counts[r.category] = Number(r.count); });
    res.json({ counts });
  } catch (err) {
    console.error('category counts error:', err);
    res.status(500).json({ error: 'Could not load category counts.' });
  }
}

// Groups one user's tagged posts into "achievements" — one entry per
// distinct tag, most-recent post as cover, full post list for the gallery.
async function achievements(req, res) {
  try {
    const { authorId } = req.query;
    if (!authorId) return res.status(400).json({ error: 'authorId is required.' });
    if (!(await canView(req.userId, authorId))) {
      return res.json({ achievements: [], goals: [], tags: [], streakAwards: [] });
    }

    const [rows] = await pool.query(
      `SELECT p.*, u.display_name, u.photo_url as author_photo,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
              EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ? AND p.tag IS NOT NULL AND p.tag <> '' AND ${VISIBLE_TO_VIEWER_SQL}
       ORDER BY p.created_at ASC`,
      [req.userId, authorId, req.userId, req.userId, req.userId, req.userId]
    );

    const byTag = new Map();
    for (const row of rows) {
      const post = mapPost(row);
      if (!byTag.has(post.tag)) byTag.set(post.tag, []);
      byTag.get(post.tag).push(post);
    }

    const [goalRows] = await pool.query(
      'SELECT tag, target_date, subtasks FROM goals WHERE author_id = ?',
      [authorId]
    );
    const goalByTag = new Map(goalRows.map((g) => [g.tag, {
      targetDate: g.target_date ? new Date(g.target_date).toISOString().slice(0, 10) : null,
      subtasks: normalizeTasks(g.subtasks),
      completed: normalizeTasks(g.subtasks).length > 0 && normalizeTasks(g.subtasks).every((t) => t.done),
    }]));

    const achievementList = [...byTag.entries()].map(([tag, posts]) => {
      const counts = {};
      posts.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
      const category = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      return {
        tag,
        category,
        count: posts.length,
        coverPost: posts[posts.length - 1],
        posts,
        goal: goalByTag.get(tag) || null,
      };
    });

    // Tagged posts track progress; only a finished, non-empty checklist earns an award.
    const earnedList = achievementList.filter((a) => a.goal?.completed);
    const trifecta = await trifectaStatus(authorId);
    const streaks = await loadGoalStreaks(achievementList.filter(item => item.goal).map(item => [authorId, item.tag]));
    const streakAwards = achievementList.filter(item => item.goal).flatMap(item =>
      goalStreakAwards(streaks.get(`${authorId}:${item.tag}`)).map(award => ({ ...award, tag: item.tag, category: item.category }))
    );
    res.json({
      streakAwards,
      achievements: earnedList,
      goals: achievementList.filter((a) => a.goal && !a.goal.completed),
      tags: achievementList.map((a) => a.tag),
      trifecta,
    });
  } catch (err) {
    console.error('achievements error:', err);
    res.status(500).json({ error: 'Could not load achievements.' });
  }
}

// Create a post — media is REQUIRED, matching the product rule that
// PackSomeWork is photos/videos only (no text-only or hashtag-only posts).
// Called after upload.single('media') middleware has already run.
async function create(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach a photo or video to post.' });

    const { category, vibe, tag, aiStyled } = req.body;
    if (!['health', 'wealth', 'relationships'].includes(category)) {
      return res.status(400).json({ error: 'Pick a category (Health, Wealth, or Relationships).' });
    }

    await ensureMemberTables();
    const id = uuidv4();
    const mediaType = mediaTypeFromMime(req.file.mimetype);
    if (mediaType === 'video' && req.body.goalTaskIndex !== undefined) return res.status(400).json({ error: 'Upload a photo to complete a task.' });
    let video = null;
    if (mediaType === 'video') {
      try { video = await preparePostVideo(req.file, req.body); }
      catch (err) { return res.status(400).json({ error: err.message }); }
    }
    const mediaUrl = await uploadMedia(video?.buffer || req.file.buffer, video ? 'clip.mp4' : req.file.originalname, video ? 'video/mp4' : req.file.mimetype, 'posts');
    const videoCoverUrl = video ? await uploadMedia(video.cover, 'cover.jpg', 'image/jpeg', 'posts') : null;
    const cleanTag = (tag || '').replace(/^#/, '').toLowerCase().slice(0, 24);
    const visibility = req.body.visibility === 'public' ? 'public' : 'friends';
    const aspectRatio = ['square', 'portrait', 'landscape'].includes(req.body.aspectRatio) ? req.body.aspectRatio : 'square';
    const cropX = clampPercent(req.body.cropX);
    const cropY = clampPercent(req.body.cropY);

    if (req.body.goalTaskIndex !== undefined) {
      if (mediaType !== 'image') return res.status(400).json({ error: 'Upload a photo to complete a task.' });
      const index = Number(req.body.goalTaskIndex);
      if (!/^\d+$/.test(String(req.body.goalTaskIndex)) || !Number.isSafeInteger(index)) {
        return res.status(400).json({ error: 'Choose a valid goal task.' });
      }
      const hasSubtaskIndex = req.body.goalSubtaskIndex !== undefined && req.body.goalSubtaskIndex !== '';
      const subtaskIndex = hasSubtaskIndex ? Number(req.body.goalSubtaskIndex) : null;
      if (hasSubtaskIndex && (!/^\d+$/.test(String(req.body.goalSubtaskIndex)) || !Number.isSafeInteger(subtaskIndex))) {
        return res.status(400).json({ error: 'Choose a valid goal subtask.' });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT id, subtasks FROM goals WHERE author_id = ? AND tag = ? FOR UPDATE', [req.userId, cleanTag]);
        const tasks = normalizeTasks(rows[0]?.subtasks);
        const parentTask = tasks[index];
        // A subtask index targets one nested level under the chosen task;
        // otherwise the task itself is the thing being checked in on.
        const target = hasSubtaskIndex ? parentTask?.subtasks?.[subtaskIndex] : parentTask;
        if (!Array.isArray(tasks) || !parentTask || !target || target.text !== req.body.goalTaskText || (req.body.goalTaskId && target.id !== req.body.goalTaskId)) {
          await connection.rollback();
          return res.status(409).json({ error: 'This goal task has changed. Reopen the uploader and choose it again.' });
        }
        await preserveGoalPhotos(connection, req.userId, cleanTag, tasks);
        await connection.query(
          `INSERT INTO posts (id, author_id, category, vibe, tag, media_url, media_type, ai_styled, visibility, aspect_ratio, crop_x, crop_y, video_cover_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, req.userId, category, (vibe || '').slice(0, 60), cleanTag, mediaUrl, mediaType, aiStyled === 'true' ? 1 : 0, visibility, aspectRatio, cropX, cropY, videoCoverUrl]
        );
        const wasDone = target.done;
        const checkIn = recordTaskCheckIn(target, req.body.timeZone);
        target.completedDays = Math.min(target.targetDays, target.completedDays + 1);
        target.done = target.completedDays >= target.targetDays;
        const taskCompleted = !wasDone && target.done;
        target.photoPostId = id;
        const progress = summarizeProgress(tasks);
        let goalStreak = null;
        let streakAward = null;
        if (checkIn) {
          const [streakRows] = await connection.query('SELECT state FROM goal_streaks WHERE author_id = ? AND tag = ?', [req.userId, cleanTag]);
          let priorState = streakRows[0]?.state;
          if (!priorState) {
            const [history] = await connection.query('SELECT day_key FROM task_checkins WHERE user_id = ? AND goal_tag = ? ORDER BY day_key', [req.userId, cleanTag]);
            priorState = goalStreakFromDays(history.map(row => row.day_key), target.streakTimeZone || req.body.timeZone);
          }
          const recorded = checkInGoal(priorState, target.streakTimeZone || req.body.timeZone);
          goalStreak = recorded.state;
          streakAward = recorded.award;
          await connection.query(`INSERT INTO goal_streaks (author_id, tag, state) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE state = VALUES(state)`, [req.userId, cleanTag, JSON.stringify(goalStreak)]);
        }
        await connection.query('INSERT INTO post_goal_progress (post_id, completed, target) VALUES (?, ?, ?)', [id, progress.completed, progress.target]);
        await connection.query('UPDATE goals SET subtasks = ? WHERE id = ?', [JSON.stringify(tasks), rows[0].id]);
        // A goal's completion — and the trifecta check below — only ever
        // looks at top-level tasks; subtasks are optional extra tracking
        // underneath a task and never gate it or the goal.
        const goalCompleted = tasks.every((task) => task.done);
        if (checkIn) await recordCheckIn(connection, { postId: id, userId: req.userId, tag: cleanTag, task: target, category, goalCompleted, goalStreakDays: goalStreak?.streakDays });
        await connection.commit();
        // Only worth the extra query when this check-in just finished a
        // goal — otherwise the trifecta condition can't have changed.
        const trifectaEarned = goalCompleted && await checkAndAwardTrifecta(req.userId);
        const celebration = checkIn ? {
          streakAward: streakAward ? { ...streakAward, category } : null,
          goalAward: goalCompleted ? { category, targetDays: progress.target } : null,
          goalStreakDays: goalStreak?.streakDays || 0,
          ...checkIn, day: target.completedDays, targetDays: target.targetDays,
          taskName: target.text, tag: cleanTag, taskCompleted, goalCompleted, trifectaEarned,
          level: Math.max(streakAward ? 3 : 1, celebrationLevel(checkIn.streakDays, taskCompleted, goalCompleted)),
        } : null;
        return res.json({ ok: true, id, taskCompleted, completedDays: target.completedDays, targetDays: target.targetDays, goalCompleted, trifectaEarned, celebration });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    await pool.query(
      `INSERT INTO posts (id, author_id, category, vibe, tag, media_url, media_type, ai_styled, visibility, aspect_ratio, crop_x, crop_y, video_cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, category, (vibe || '').slice(0, 60), cleanTag, mediaUrl, mediaType, aiStyled === 'true' ? 1 : 0, visibility, aspectRatio, cropX, cropY, videoCoverUrl]
    );

    // Optional goal metadata, only ever set the first time a tag is used
    // (from the composer, or from an edit that retags a post onto a brand
    // new tag) — INSERT IGNORE makes this a safe no-op if the client's
    // new-tag check was stale and a goal already exists.
    await maybeCreateGoal(req.userId, cleanTag, req.body.goalTargetDate, req.body.goalSubtasks);

    if (cleanTag) {
      const [goals] = await pool.query('SELECT subtasks FROM goals WHERE author_id = ? AND tag = ?', [req.userId, cleanTag]);
      if (goals.length) await preserveGoalPhotos(pool, req.userId, cleanTag, normalizeTasks(goals[0].subtasks));
    }
    res.json({ ok: true, id });
  } catch (e) {
    console.error('create post error:', e);
    res.status(500).json({ error: 'Something went wrong creating your post.' });
  }
}

async function maybeCreateGoal(authorId, tag, goalTargetDate, goalSubtasksRaw) {
  if (!tag || !(goalTargetDate || goalSubtasksRaw)) return;
  let taskInput = [];
  try { taskInput = JSON.parse(goalSubtasksRaw || '[]'); } catch { taskInput = []; }
  const subtasks = buildFreshTaskList(taskInput);
  await pool.query(
    `INSERT IGNORE INTO goals (id, author_id, tag, target_date, subtasks)
     VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), authorId, tag, goalTargetDate || null, JSON.stringify(subtasks)]
  );
}

// Edits category/vibe/tag/visibility only — media isn't editable
// (delete-and-repost covers that). Retagging onto a brand-new tag offers
// the same optional goal setup as creating a fresh post with a new tag;
// retagging away from a tag that then has zero posts left cleans up its
// now-orphaned goal.
async function update(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Post not found.' });
    const post = rows[0];
    if (post.author_id !== req.userId) return res.status(403).json({ error: 'You can only edit your own posts.' });

    const { category, vibe, tag } = req.body || {};
    if (!['health', 'wealth', 'relationships'].includes(category)) {
      return res.status(400).json({ error: 'Pick a category (Health, Wealth, or Relationships).' });
    }
    const cleanTag = (tag || '').replace(/^#/, '').toLowerCase().slice(0, 24);
    const oldTag = post.tag;
    const visibility = req.body.visibility === 'public' ? 'public' : 'friends';
    const aspectRatio = ['square', 'portrait', 'landscape'].includes(req.body.aspectRatio) ? req.body.aspectRatio : 'square';
    const cropX = clampPercent(req.body.cropX ?? post.crop_x);
    const cropY = clampPercent(req.body.cropY ?? post.crop_y);

    await pool.query(
      'UPDATE posts SET category = ?, vibe = ?, tag = ?, visibility = ?, aspect_ratio = ?, crop_x = ?, crop_y = ? WHERE id = ?',
      [category, (vibe || '').slice(0, 60), cleanTag, visibility, aspectRatio, cropX, cropY, post.id]
    );

    if (cleanTag !== oldTag) {
      await deleteGoalIfOrphaned(req.userId, oldTag);
      const [existingForNewTag] = await pool.query(
        'SELECT 1 FROM posts WHERE author_id = ? AND tag = ? AND id != ? LIMIT 1',
        [req.userId, cleanTag, post.id]
      );
      if (!existingForNewTag.length) {
        await maybeCreateGoal(req.userId, cleanTag, req.body.goalTargetDate, req.body.goalSubtasks);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('update post error:', err);
    res.status(500).json({ error: 'Something went wrong saving your changes.' });
  }
}

async function remove(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Post not found.' });
    const post = rows[0];
    if (post.author_id !== req.userId) return res.status(403).json({ error: 'You can only delete your own posts.' });

    await pool.query('DELETE FROM posts WHERE id = ?', [post.id]);
    await deleteGoalIfOrphaned(req.userId, post.tag);
    await deleteMedia(post.media_url).catch(() => {});
    if (post.video_cover_url) await deleteMedia(post.video_cover_url).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    console.error('delete post error:', err);
    res.status(500).json({ error: 'Something went wrong deleting your post.' });
  }
}

async function listPostPeople(req, res) {
  try {
    const kind = req.params.kind || 'likes';
    const sources = { likes: ['post_likes', 'user_id'], comments: ['comments', 'author_id'], cheers: ['post_reactions', 'user_id'] };
    if (!sources[kind]) return res.status(400).json({ error: 'Choose likes, comments, or cheers.' });
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const offset = Math.max(0, Math.min(1000000, Math.floor(Number(req.query.offset) || 0)));
    const [table, personColumn] = sources[kind];
    const reaction = kind === 'cheers' ? req.query.reaction : null;
    if (reaction && !ALLOWED_REACTIONS.has(reaction)) return res.status(400).json({ error: 'Not a valid cheer.' });
    const [rows] = await pool.query(`
      SELECT DISTINCT u.id, u.display_name, u.photo_url, ${kind === 'cheers' ? 'activity.reaction' : 'NULL'} AS cheer,
        (SELECT f.status FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id LIMIT 1) AS follow_status
      FROM ${table} activity JOIN users u ON u.id = activity.${personColumn}
      WHERE activity.post_id = ? AND NOT EXISTS (
        SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = u.id)
          OR (b.blocked_id = ? AND b.blocker_id = u.id)
      ) ${reaction ? 'AND activity.reaction = ?' : ''}
      ORDER BY u.id LIMIT 51 OFFSET ?`, [req.userId, req.params.id, req.userId, req.userId, ...(reaction ? [reaction] : []), offset]);
    res.json({ users: rows.slice(0, 50).map(u => ({ id: u.id, displayName: u.display_name, photoUrl: u.photo_url, followStatus: u.id === req.userId ? 'me' : (u.follow_status || 'none'), ...(kind === 'cheers' ? { cheer: u.cheer } : {}) })), hasMore: rows.length > 50 });
  } catch (err) {
    console.error('list post people error:', err);
    res.status(500).json({ error: 'Could not load this list.' });
  }
}

const listLikes = listPostPeople;

async function like(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const { id } = req.params;
    const [existing] = await pool.query(
      'SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length) {
      await pool.query('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [id, req.userId]);
      return res.json({ liked: false });
    }
    await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [id, req.userId]);
    const [postRows] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [id]);
    if (postRows[0]) await notify(postRows[0].author_id, req.userId, 'like', id);
    res.json({ liked: true });
  } catch (err) {
    console.error('like error:', err);
    res.status(500).json({ error: 'Could not update like.' });
  }
}

// A quick sticker reaction attached straight to the post — never a
// comment. One reaction per user per post: sending the reaction already
// active removes it, sending a different one swaps it.
async function setPostReaction(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const { id } = req.params;
    const { reaction } = req.body || {};
    if (!reaction || !ALLOWED_REACTIONS.has(reaction)) return res.status(400).json({ error: 'Not a valid reaction.' });
    const [existing] = await pool.query(
      'SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (existing.length && existing[0].reaction === reaction) {
      await pool.query('DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?', [id, req.userId]);
      return res.json({ myReaction: null, cheers: (await cheerCounts(pool, [id])).get(id) || [] });
    }
    await pool.query(
      'INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)',
      [id, req.userId, reaction]
    );
    if (!existing.length) {
      const [postRows] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [id]);
      if (postRows[0]) await notify(postRows[0].author_id, req.userId, 'reaction', id);
    }
    res.json({ myReaction: reaction, cheers: (await cheerCounts(pool, [id])).get(id) || [] });
  } catch (err) {
    console.error('set post reaction error:', err);
    res.status(500).json({ error: 'Could not update reaction.' });
  }
}

async function listComments(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const [rows] = await pool.query(
      `SELECT c.*, u.display_name FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    const reactionsByComment = new Map();
    if (rows.length) {
      const commentIds = rows.map((r) => r.id);
      const placeholders = commentIds.map(() => '?').join(',');
      const [reactionRows] = await pool.query(
        `SELECT comment_id, reaction, COUNT(*) as count,
                SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted_by_me
         FROM comment_reactions WHERE comment_id IN (${placeholders})
         GROUP BY comment_id, reaction`,
        [req.userId, ...commentIds]
      );
      for (const r of reactionRows) {
        if (!reactionsByComment.has(r.comment_id)) reactionsByComment.set(r.comment_id, []);
        reactionsByComment.get(r.comment_id).push({ reaction: r.reaction, count: Number(r.count), reactedByMe: Number(r.reacted_by_me) > 0 });
      }
    }

    res.json({
      comments: rows.map(r => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.display_name,
        text: r.text,
        sticker: r.sticker,
        createdAt: new Date(r.created_at).getTime(),
        reactions: reactionsByComment.get(r.id) || [],
      })),
    });
  } catch (err) {
    console.error('list comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
}

// Toggles one of my reactions on a comment — reacting again with the same
// key removes it, matching how every other "react" affordance in the app
// (likes, follows) treats a second tap as undo.
async function toggleCommentReaction(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const { reaction } = req.body || {};
    if (!ALLOWED_REACTIONS.has(reaction)) return res.status(400).json({ error: 'Not a valid reaction.' });
    const [commentRows] = await pool.query('SELECT 1 FROM comments WHERE id = ? AND post_id = ?', [req.params.commentId, req.params.id]);
    if (!commentRows.length) return res.status(404).json({ error: 'Comment not found.' });

    const [existing] = await pool.query(
      'SELECT 1 FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND reaction = ?',
      [req.params.commentId, req.userId, reaction]
    );
    if (existing.length) {
      await pool.query(
        'DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND reaction = ?',
        [req.params.commentId, req.userId, reaction]
      );
      return res.json({ ok: true, active: false });
    }
    await pool.query(
      'INSERT IGNORE INTO comment_reactions (comment_id, user_id, reaction) VALUES (?, ?, ?)',
      [req.params.commentId, req.userId, reaction]
    );
    res.json({ ok: true, active: true });
  } catch (err) {
    console.error('toggle comment reaction error:', err);
    res.status(500).json({ error: 'Could not update that reaction.' });
  }
}

async function addComment(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const sticker = req.body?.sticker || null;
    if (sticker && !ALLOWED_REACTIONS.has(sticker)) return res.status(400).json({ error: 'Not a valid sticker.' });
    if (!rawText && !sticker) return res.status(400).json({ error: 'Add some text or a sticker to comment.' });
    const id = uuidv4();
    await pool.query(
      'INSERT INTO comments (id, post_id, author_id, text, sticker) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.id, req.userId, rawText.slice(0, 500), sticker]
    );
    const [postRows] = await pool.query('SELECT author_id FROM posts WHERE id = ?', [req.params.id]);
    if (postRows[0]) await notify(postRows[0].author_id, req.userId, 'comment', req.params.id);
    res.json({ ok: true, id });
  } catch (err) {
    console.error('add comment error:', err);
    res.status(500).json({ error: 'Could not add comment.' });
  }
}

async function updateComment(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const [rows] = await pool.query('SELECT author_id FROM comments WHERE id = ? AND post_id = ?', [req.params.commentId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Comment not found.' });
    if (rows[0].author_id !== req.userId) return res.status(403).json({ error: 'You can only edit your own comments.' });
    await pool.query('UPDATE comments SET text = ? WHERE id = ?', [text.trim().slice(0, 500), req.params.commentId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('update comment error:', err);
    res.status(500).json({ error: 'Could not update comment.' });
  }
}

async function deleteComment(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const [rows] = await pool.query('SELECT author_id FROM comments WHERE id = ? AND post_id = ?', [req.params.commentId, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Comment not found.' });
    if (rows[0].author_id !== req.userId) return res.status(403).json({ error: 'You can only delete your own comments.' });
    await pool.query('DELETE FROM comments WHERE id = ? AND post_id = ?', [req.params.commentId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('delete comment error:', err);
    res.status(500).json({ error: 'Could not delete comment.' });
  }
}

module.exports = { list, get, trendingTags, searchTags, categoryCounts, achievements, create, update, remove, listLikes, listPostPeople, like, setPostReaction, listComments, addComment, updateComment, deleteComment, toggleCommentReaction };
