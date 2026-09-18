const pool = require('../db');

// 'me' | 'accepted' | 'pending' | 'none' — from viewerId's perspective looking at targetId.
async function getFollowStatus(viewerId, targetId) {
  if (viewerId === targetId) return 'me';
  const [rows] = await pool.query(
    'SELECT status FROM follows WHERE follower_id = ? AND followee_id = ? LIMIT 1',
    [viewerId, targetId]
  );
  return rows.length ? rows[0].status : 'none';
}

async function canView(viewerId, authorId) {
  const status = await getFollowStatus(viewerId, authorId);
  return status === 'me' || status === 'accepted';
}

module.exports = { getFollowStatus, canView };
