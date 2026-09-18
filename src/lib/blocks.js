const pool = require('../db');

// Blocking is stored one-directional (who blocked whom) but always checked
// as mutual — neither side should see the other's content once either has
// blocked.
async function isBlocked(userA, userB) {
  const [rows] = await pool.query(
    'SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1',
    [userA, userB, userB, userA]
  );
  return rows.length > 0;
}

module.exports = { isBlocked };
