const pool = require('../db');

// 'me' | 'active' | 'pending_outgoing' | 'pending_incoming' | 'none' —
// from viewerId's perspective looking at targetId.
async function getPartnerStatus(viewerId, targetId) {
  if (viewerId === targetId) return 'me';
  const [rows] = await pool.query(
    `SELECT requester_id, status FROM accountability_partners
     WHERE (requester_id = ? AND partner_id = ?) OR (requester_id = ? AND partner_id = ?) LIMIT 1`,
    [viewerId, targetId, targetId, viewerId]
  );
  if (!rows.length) return 'none';
  if (rows[0].status === 'active') return 'active';
  return rows[0].requester_id === viewerId ? 'pending_outgoing' : 'pending_incoming';
}

module.exports = { getPartnerStatus };
