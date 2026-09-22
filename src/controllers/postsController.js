const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { canViewPost } = require('../lib/access');
const { recordTaskCheckIn, celebrationLevel } = require('../lib/taskCelebration');
const { targetDays, normalizeTasks } = require('../lib/goalProgress');
const { canView } = require('../lib/follows');
const { notify } = require('../lib/notifications');
const { uploadMedia, deleteMedia } = require('../lib/storage');

function mediaTypeFromMime(mime) {
  return mime && mime.startsWith('video') ? 'video' : 'image';
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
    aiStyled: !!row.ai_styled,
    visibility: row.visibility,
    aspectRatio: row.aspect_ratio,
    createdAt: new Date(row.created_at).getTime(),
    likeCount: Number(row.like_count || 0),
    likedByMe: !!row.liked_by_me,
    commentCount: Number(row.comment_count || 0),
  };
}

// Attaches a { completed, target } day-count summary to each post whose
// tag has a goal, in one batched query rather than one per post.
async function attachGoalProgress(posts) {
  const pairs = [...new Map(
    posts.filter((p) => p.tag).map((p) => [`${p.authorId}:${p.tag}`, [p.authorId, p.tag]])
  ).values()];
  if (!pairs.length) return posts;

  const placeholders = pairs.map(() => '(?,?)').join(',');
  const [goalRows] = await pool.query(
    `SELECT author_id, tag, subtasks FROM goals WHERE (author_id, tag) IN (${placeholders})`,
    pairs.flat()
  );
  const byKey = new Map(goalRows.map((g) => [`${g.author_id}:${g.tag}`, normalizeTasks(g.subtasks)]));

  return posts.map((post) => {
    const tasks = post.tag ? byKey.get(`${post.authorId}:${post.tag}`) : null;
    if (!tasks || !tasks.length) return post;
    const goalProgress = tasks.reduce(
      (acc, t) => ({ completed: acc.completed + t.completedDays, target: acc.target + t.targetDays }),
      { completed: 0, target: 0 }
    );
    return { ...post, goalProgress };
  });
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
               EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me
               FROM posts p JOIN users u ON u.id = p.author_id
               WHERE ${VISIBLE_TO_VIEWER_SQL}`;
    const params = [req.userId, req.userId, req.userId, req.userId, req.userId];
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
    res.json({ posts, hasMore });
  } catch (err) {
    console.error('list posts error:', err);
    res.status(500).json({ error: 'Could not load posts.' });
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
      return res.json({ achievements: [], goals: [], tags: [] });
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
    res.json({
      achievements: achievementList.filter((a) => a.goal?.completed),
      goals: achievementList.filter((a) => a.goal && !a.goal.completed),
      tags: achievementList.map((a) => a.tag),
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

    const id = uuidv4();
    const mediaUrl = await uploadMedia(req.file.buffer, req.file.originalname, req.file.mimetype, 'posts');
    const mediaType = mediaTypeFromMime(req.file.mimetype);
    const cleanTag = (tag || '').replace(/^#/, '').toLowerCase().slice(0, 24);
    const visibility = req.body.visibility === 'public' ? 'public' : 'friends';
    const aspectRatio = ['square', 'portrait', 'landscape'].includes(req.body.aspectRatio) ? req.body.aspectRatio : 'square';

    if (req.body.goalTaskIndex !== undefined) {
      if (mediaType !== 'image') return res.status(400).json({ error: 'Upload a photo to complete a task.' });
      const index = Number(req.body.goalTaskIndex);
      if (!/^\d+$/.test(String(req.body.goalTaskIndex)) || !Number.isSafeInteger(index)) {
        return res.status(400).json({ error: 'Choose a valid goal task.' });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT id, subtasks FROM goals WHERE author_id = ? AND tag = ? FOR UPDATE', [req.userId, cleanTag]);
        const subtasks = normalizeTasks(rows[0]?.subtasks);
        if (!Array.isArray(subtasks) || !subtasks[index] || subtasks[index].text !== req.body.goalTaskText || (req.body.goalTaskId && subtasks[index].id !== req.body.goalTaskId)) {
          await connection.rollback();
          return res.status(409).json({ error: 'This goal task has changed. Reopen the uploader and choose it again.' });
        }
        await connection.query(
          `INSERT INTO posts (id, author_id, category, vibe, tag, media_url, media_type, ai_styled, visibility, aspect_ratio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, req.userId, category, (vibe || '').slice(0, 60), cleanTag, mediaUrl, mediaType, aiStyled === 'true' ? 1 : 0, visibility, aspectRatio]
        );
        const wasDone = subtasks[index].done;
        const checkIn = recordTaskCheckIn(subtasks[index], req.body.timeZone);
        subtasks[index].completedDays = Math.min(subtasks[index].targetDays, subtasks[index].completedDays + 1);
        subtasks[index].done = subtasks[index].completedDays >= subtasks[index].targetDays;
        const taskCompleted = !wasDone && subtasks[index].done;
        subtasks[index].photoPostId = id;
        await connection.query('UPDATE goals SET subtasks = ? WHERE id = ?', [JSON.stringify(subtasks), rows[0].id]);
        await connection.commit();
        const goalCompleted = subtasks.every((task) => task.done);
        const celebration = checkIn ? {
          ...checkIn, day: subtasks[index].completedDays, targetDays: subtasks[index].targetDays,
          taskName: subtasks[index].text, tag: cleanTag, taskCompleted, goalCompleted,
          level: celebrationLevel(checkIn.streakDays, taskCompleted, goalCompleted),
        } : null;
        return res.json({ ok: true, id, taskCompleted, completedDays: subtasks[index].completedDays, targetDays: subtasks[index].targetDays, goalCompleted, celebration });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    await pool.query(
      `INSERT INTO posts (id, author_id, category, vibe, tag, media_url, media_type, ai_styled, visibility, aspect_ratio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, category, (vibe || '').slice(0, 60), cleanTag, mediaUrl, mediaType, aiStyled === 'true' ? 1 : 0, visibility, aspectRatio]
    );

    // Optional goal metadata, only ever set the first time a tag is used
    // (from the composer, or from an edit that retags a post onto a brand
    // new tag) — INSERT IGNORE makes this a safe no-op if the client's
    // new-tag check was stale and a goal already exists.
    await maybeCreateGoal(req.userId, cleanTag, req.body.goalTargetDate, req.body.goalSubtasks);

    res.json({ ok: true, id });
  } catch (e) {
    console.error('create post error:', e);
    res.status(500).json({ error: 'Something went wrong creating your post.' });
  }
}

async function maybeCreateGoal(authorId, tag, goalTargetDate, goalSubtasksRaw) {
  if (!tag || !(goalTargetDate || goalSubtasksRaw)) return;
  let subtaskTexts = [];
  try { subtaskTexts = JSON.parse(goalSubtasksRaw || '[]'); } catch { subtaskTexts = []; }
  const subtasks = (Array.isArray(subtaskTexts) ? subtaskTexts : [])
    .map((t) => typeof t === 'string' ? { text: t } : t)
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .slice(0, 15)
    .map((t) => ({ id: uuidv4(), text: t.text.trim().slice(0, 140), targetDays: targetDays(t.targetDays), completedDays: 0, done: false }));
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

    await pool.query(
      'UPDATE posts SET category = ?, vibe = ?, tag = ?, visibility = ?, aspect_ratio = ? WHERE id = ?',
      [category, (vibe || '').slice(0, 60), cleanTag, visibility, aspectRatio, post.id]
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

    res.json({ ok: true });
  } catch (err) {
    console.error('delete post error:', err);
    res.status(500).json({ error: 'Something went wrong deleting your post.' });
  }
}

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

async function listComments(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const [rows] = await pool.query(
      `SELECT c.*, u.display_name FROM comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    res.json({
      comments: rows.map(r => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.display_name,
        text: r.text,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  } catch (err) {
    console.error('list comments error:', err);
    res.status(500).json({ error: 'Could not load comments.' });
  }
}

async function addComment(req, res) {
  try {
    if (!(await canViewPost(req.userId, req.params.id))) return res.status(404).json({ error: 'Post not found.' });
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const id = uuidv4();
    await pool.query(
      'INSERT INTO comments (id, post_id, author_id, text) VALUES (?, ?, ?, ?)',
      [id, req.params.id, req.userId, text.trim().slice(0, 500)]
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

module.exports = { list, trendingTags, categoryCounts, achievements, create, update, remove, like, listComments, addComment, updateComment, deleteComment };
