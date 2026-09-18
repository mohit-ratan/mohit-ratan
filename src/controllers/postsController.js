const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

function mediaTypeFromMime(mime) {
  return mime && mime.startsWith('video') ? 'video' : 'image';
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
    createdAt: new Date(row.created_at).getTime(),
    likeCount: Number(row.like_count || 0),
    likedByMe: !!row.liked_by_me,
    commentCount: Number(row.comment_count || 0),
  };
}

// Media-only feed — a post with no media is never created (see create() below),
// so this list is inherently "photos and videos only".
async function list(req, res) {
  try {
    const { category, tag, authorId } = req.query;
    let sql = `SELECT p.*, u.display_name, u.photo_url as author_photo,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
               EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me
               FROM posts p JOIN users u ON u.id = p.author_id WHERE 1=1`;
    const params = [req.userId];
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
    sql += ' ORDER BY p.created_at DESC LIMIT 300';
    const [rows] = await pool.query(sql, params);
    res.json({ posts: rows.map(mapPost) });
  } catch (err) {
    console.error('list posts error:', err);
    res.status(500).json({ error: 'Could not load posts.' });
  }
}

// Trending tags across recent posts (for the sidebar)
async function trendingTags(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT tag, COUNT(*) as count FROM posts
       WHERE tag IS NOT NULL AND tag <> ''
       GROUP BY tag ORDER BY count DESC LIMIT 8`
    );
    res.json({ tags: rows.map(r => ({ tag: r.tag, count: Number(r.count) })) });
  } catch (err) {
    console.error('trending tags error:', err);
    res.status(500).json({ error: 'Could not load trending tags.' });
  }
}

async function categoryCounts(req, res) {
  try {
    const [rows] = await pool.query(`SELECT category, COUNT(*) as count FROM posts GROUP BY category`);
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

    const [rows] = await pool.query(
      `SELECT p.*, u.display_name, u.photo_url as author_photo,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) as comment_count,
              EXISTS(SELECT 1 FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ? AND p.tag IS NOT NULL AND p.tag <> ''
       ORDER BY p.created_at ASC`,
      [req.userId, authorId]
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
      subtasks: g.subtasks || [],
      completed: Array.isArray(g.subtasks) && g.subtasks.length > 0 && g.subtasks.every((t) => t.done),
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

    res.json({ achievements: achievementList });
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
    const mediaUrl = `/assets/uploads/${req.file.filename}`;
    const mediaType = mediaTypeFromMime(req.file.mimetype);
    const cleanTag = (tag || '').replace(/^#/, '').toLowerCase().slice(0, 24);

    await pool.query(
      `INSERT INTO posts (id, author_id, category, vibe, tag, media_url, media_type, ai_styled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, category, (vibe || '').slice(0, 60), cleanTag, mediaUrl, mediaType, aiStyled === 'true' ? 1 : 0]
    );

    // Optional goal metadata, only ever set from the composer the first
    // time a tag is used — INSERT IGNORE makes this a safe no-op if the
    // client's new-tag check was stale and a goal already exists.
    if (cleanTag && (req.body.goalTargetDate || req.body.goalSubtasks)) {
      let subtaskTexts = [];
      try { subtaskTexts = JSON.parse(req.body.goalSubtasks || '[]'); } catch { subtaskTexts = []; }
      const subtasks = subtaskTexts
        .filter((t) => typeof t === 'string' && t.trim())
        .slice(0, 15)
        .map((t) => ({ text: t.trim().slice(0, 140), done: false }));
      await pool.query(
        `INSERT IGNORE INTO goals (id, author_id, tag, target_date, subtasks)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), req.userId, cleanTag, req.body.goalTargetDate || null, JSON.stringify(subtasks)]
      );
    }

    res.json({ ok: true, id });
  } catch (e) {
    console.error('create post error:', e);
    res.status(500).json({ error: 'Something went wrong creating your post.' });
  }
}

async function like(req, res) {
  try {
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
    res.json({ liked: true });
  } catch (err) {
    console.error('like error:', err);
    res.status(500).json({ error: 'Could not update like.' });
  }
}

async function listComments(req, res) {
  try {
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
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
    const id = uuidv4();
    await pool.query(
      'INSERT INTO comments (id, post_id, author_id, text) VALUES (?, ?, ?, ?)',
      [id, req.params.id, req.userId, text.trim().slice(0, 500)]
    );
    res.json({ ok: true, id });
  } catch (err) {
    console.error('add comment error:', err);
    res.status(500).json({ error: 'Could not add comment.' });
  }
}

module.exports = { list, trendingTags, categoryCounts, achievements, create, like, listComments, addComment };
