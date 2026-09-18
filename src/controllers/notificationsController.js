const pool = require('../db');

// Recent activity aimed at the signed-in user (likes, comments, accepted
// follow requests) — read-only, unlike the separate pending-request inbox
// in followsController which needs accept/reject actions.
async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.type, n.post_id, n.read_at, n.created_at,
              u.id as actor_id, u.display_name as actor_name, u.photo_url as actor_photo
       FROM notifications n JOIN users u ON u.id = n.actor_id
       WHERE n.recipient_id = ?
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [req.userId]
    );
    res.json({
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        postId: n.post_id,
        actorId: n.actor_id,
        actorName: n.actor_name,
        actorPhotoUrl: n.actor_photo,
        read: !!n.read_at,
        createdAt: new Date(n.created_at).getTime(),
      })),
    });
  } catch (err) {
    console.error('list notifications error:', err);
    res.status(500).json({ error: 'Could not load notifications.' });
  }
}

async function markRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET read_at = NOW() WHERE recipient_id = ? AND read_at IS NULL',
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('mark notifications read error:', err);
    res.status(500).json({ error: 'Could not update notifications.' });
  }
}

module.exports = { list, markRead };
