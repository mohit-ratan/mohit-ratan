const pool = require('../db');

async function block(req, res) {
  try {
    const blockedId = req.params.id;
    if (blockedId === req.userId) return res.status(400).json({ error: "You can't block yourself." });
    const [target] = await pool.query('SELECT 1 FROM users WHERE id = ?', [blockedId]);
    if (!target.length) return res.status(404).json({ error: 'User not found.' });

    await pool.query('INSERT IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', [req.userId, blockedId]);
    // Blocking severs any existing follow relationship in both directions.
    await pool.query(
      'DELETE FROM follows WHERE (follower_id = ? AND followee_id = ?) OR (follower_id = ? AND followee_id = ?)',
      [req.userId, blockedId, blockedId, req.userId]
    );
    // ...and any accountability partnership, pending or active.
    await pool.query(
      'DELETE FROM accountability_partners WHERE (requester_id = ? AND partner_id = ?) OR (requester_id = ? AND partner_id = ?)',
      [req.userId, blockedId, blockedId, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('block error:', err);
    res.status(500).json({ error: 'Could not block this user.' });
  }
}

async function unblock(req, res) {
  try {
    await pool.query('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?', [req.userId, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('unblock error:', err);
    res.status(500).json({ error: 'Could not unblock this user.' });
  }
}

async function listBlocked(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url FROM blocks b
       JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = ? ORDER BY b.created_at DESC`,
      [req.userId]
    );
    res.json({ users: rows.map((u) => ({ id: u.id, displayName: u.display_name, photoUrl: u.photo_url })) });
  } catch (err) {
    console.error('list blocked error:', err);
    res.status(500).json({ error: 'Could not load blocked accounts.' });
  }
}

module.exports = { block, unblock, listBlocked };
