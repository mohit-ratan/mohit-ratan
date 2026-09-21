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

// People who have a goal under the same tag as one of the viewer's own
// goals — excludes yourself, anyone you already follow (pending or
// accepted), and blocked relationships either direction. Ranked by how
// many tags overlap.
async function suggestions(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url,
              GROUP_CONCAT(DISTINCT g2.tag ORDER BY g2.tag SEPARATOR ',') as matching_tags,
              COUNT(DISTINCT g2.tag) as match_count
       FROM goals g1
       JOIN goals g2 ON g2.tag = g1.tag AND g2.author_id != g1.author_id
       JOIN users u ON u.id = g2.author_id
       WHERE g1.author_id = ?
       AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = g2.author_id)
       AND NOT EXISTS (
         SELECT 1 FROM blocks b WHERE (b.blocker_id = ? AND b.blocked_id = g2.author_id) OR (b.blocker_id = g2.author_id AND b.blocked_id = ?)
       )
       GROUP BY u.id, u.display_name, u.photo_url
       ORDER BY match_count DESC, u.display_name ASC
       LIMIT 10`,
      [req.userId, req.userId, req.userId, req.userId]
    );

    res.json({
      suggestions: rows.map((r) => ({
        id: r.id,
        displayName: r.display_name,
        photoUrl: r.photo_url,
        matchingTags: r.matching_tags ? r.matching_tags.split(',') : [],
      })),
    });
  } catch (err) {
    console.error('suggestions error:', err);
    res.status(500).json({ error: 'Could not load suggestions.' });
  }
}

module.exports = { search, suggestions };
