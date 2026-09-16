const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

// Stories older than 24h are simply never returned — no cleanup job needed.
async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.display_name, u.photo_url as author_photo,
       EXISTS(SELECT 1 FROM story_views sv WHERE sv.story_id = s.id AND sv.user_id = ?) as viewed_by_me
       FROM stories s JOIN users u ON u.id = s.author_id
       WHERE s.created_at > (NOW() - INTERVAL 24 HOUR)
       ORDER BY s.created_at ASC`,
      [req.userId]
    );
    res.json({
      stories: rows.map(r => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.display_name,
        authorPhotoUrl: r.author_photo,
        vibe: r.vibe,
        tag: r.tag,
        mediaUrl: r.media_url,
        mediaType: r.media_type,
        aiStyled: !!r.ai_styled,
        createdAt: new Date(r.created_at).getTime(),
        viewedByMe: !!r.viewed_by_me,
      })),
    });
  } catch (err) {
    console.error('list stories error:', err);
    res.status(500).json({ error: 'Could not load stories.' });
  }
}

// Called after upload.single('media') middleware has already run.
async function create(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach a photo or video to your story.' });
    const { vibe, tag, aiStyled } = req.body;
    const id = uuidv4();
    const mediaUrl = `/assets/uploads/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const cleanTag = (tag || '').replace(/^#/, '').toLowerCase().slice(0, 24);

    await pool.query(
      `INSERT INTO stories (id, author_id, vibe, tag, media_url, media_type, ai_styled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, (vibe || '').slice(0, 60), cleanTag, mediaUrl, mediaType, aiStyled === 'true' ? 1 : 0]
    );
    res.json({ ok: true, id });
  } catch (e) {
    console.error('create story error:', e);
    res.status(500).json({ error: 'Something went wrong sharing your story.' });
  }
}

async function view(req, res) {
  try {
    await pool.query(
      'INSERT IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)',
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('story view error:', err);
    res.status(500).json({ error: 'Could not record view.' });
  }
}

module.exports = { list, create, view };
