const pool = require('../db');
const { getFollowStatus } = require('../lib/follows');

// Finds people to follow by display name. Only exposes public-safe fields
// (id, name, photo) plus the viewer's own follow status toward each match.
async function search(req, res) {
  try {
    const q = (req.query.q || '').trim().slice(0, 100);
    if (!q) return res.json({ users: [] });

    const [rows] = await pool.query(
      `SELECT id, display_name, photo_url FROM users
       WHERE id != ? AND display_name LIKE ?
       AND NOT EXISTS (
         SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = users.id) OR (b.blocker_id = users.id AND b.blocked_id = ?)
       )
       ORDER BY display_name ASC LIMIT 20`,
      [req.userId, `%${q}%`, req.userId, req.userId]
    );

    const users = await Promise.all(rows.map(async (u) => ({
      id: u.id,
      displayName: u.display_name,
      photoUrl: u.photo_url,
      followStatus: await getFollowStatus(req.userId, u.id),
    })));

    res.json({ users });
  } catch (err) {
    console.error('search users error:', err);
    res.status(500).json({ error: 'Could not search people.' });
  }
}

module.exports = { search };
