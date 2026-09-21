const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { isBlocked } = require('../lib/blocks');
const { canView } = require('../lib/follows');
const { notify } = require('../lib/notifications');

// Requires being able to see each other's posts already — a partnership
// with no visibility into each other's activity wouldn't mean much.
async function request(req, res) {
  try {
    const partnerId = req.params.id;
    if (partnerId === req.userId) {
      return res.status(400).json({ error: "You can't partner with yourself." });
    }
    if (await isBlocked(req.userId, partnerId)) {
      return res.status(403).json({ error: 'You cannot partner with this account.' });
    }
    if (!(await canView(req.userId, partnerId)) || !(await canView(partnerId, req.userId))) {
      return res.status(403).json({ error: 'You both need to follow each other first.' });
    }

    const [existing] = await pool.query(
      `SELECT status FROM accountability_partners
       WHERE (requester_id = ? AND partner_id = ?) OR (requester_id = ? AND partner_id = ?)`,
      [req.userId, partnerId, partnerId, req.userId]
    );
    if (existing.length) return res.json({ status: existing[0].status === 'active' ? 'active' : 'pending' });

    await pool.query(
      'INSERT INTO accountability_partners (id, requester_id, partner_id, status) VALUES (?, ?, ?, ?)',
      [uuidv4(), req.userId, partnerId, 'pending']
    );
    await notify(partnerId, req.userId, 'partner_request');
    res.json({ status: 'pending' });
  } catch (err) {
    console.error('accountability request error:', err);
    res.status(500).json({ error: 'Could not send that request.' });
  }
}

// Only the invited partner can accept/reject.
async function respond(req, res) {
  try {
    const requesterId = req.params.id;
    const { action } = req.body || {};
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }
    const [rows] = await pool.query(
      "SELECT 1 FROM accountability_partners WHERE requester_id = ? AND partner_id = ? AND status = 'pending'",
      [requesterId, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No pending request from this user.' });

    if (action === 'accept') {
      await pool.query(
        "UPDATE accountability_partners SET status = 'active' WHERE requester_id = ? AND partner_id = ?",
        [requesterId, req.userId]
      );
      await notify(requesterId, req.userId, 'partner_accepted');
    } else {
      await pool.query(
        'DELETE FROM accountability_partners WHERE requester_id = ? AND partner_id = ?',
        [requesterId, req.userId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('respond to accountability request error:', err);
    res.status(500).json({ error: 'Could not update that request.' });
  }
}

// Ends an active partnership, or cancels a pending request either side
// sent — same action regardless of which one it is.
async function unpair(req, res) {
  try {
    const otherId = req.params.id;
    await pool.query(
      'DELETE FROM accountability_partners WHERE (requester_id = ? AND partner_id = ?) OR (requester_id = ? AND partner_id = ?)',
      [req.userId, otherId, otherId, req.userId]
    );
    res.json({ status: 'none' });
  } catch (err) {
    console.error('unpair error:', err);
    res.status(500).json({ error: 'Could not update that partnership.' });
  }
}

// Pending requests waiting on the signed-in user's approval.
async function listRequests(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url, a.created_at
       FROM accountability_partners a JOIN users u ON u.id = a.requester_id
       WHERE a.partner_id = ? AND a.status = 'pending'
       ORDER BY a.created_at DESC`,
      [req.userId]
    );
    res.json({
      requests: rows.map((r) => ({
        id: r.id,
        displayName: r.display_name,
        photoUrl: r.photo_url,
        createdAt: new Date(r.created_at).getTime(),
      })),
    });
  } catch (err) {
    console.error('list accountability requests error:', err);
    res.status(500).json({ error: 'Could not load requests.' });
  }
}

// Active partners, plus whether each has posted or shared a story today —
// so the widget can show who might need a nudge.
async function listMine(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url,
              (EXISTS(SELECT 1 FROM posts p WHERE p.author_id = u.id AND DATE(p.created_at) = CURDATE())
               OR EXISTS(SELECT 1 FROM stories s WHERE s.author_id = u.id AND DATE(s.created_at) = CURDATE())) AS posted_today
       FROM accountability_partners a
       JOIN users u ON u.id = (CASE WHEN a.requester_id = ? THEN a.partner_id ELSE a.requester_id END)
       WHERE a.status = 'active' AND (a.requester_id = ? OR a.partner_id = ?)
       ORDER BY u.display_name ASC`,
      [req.userId, req.userId, req.userId]
    );
    res.json({
      partners: rows.map((r) => ({
        id: r.id,
        displayName: r.display_name,
        photoUrl: r.photo_url,
        postedToday: !!r.posted_today,
      })),
    });
  } catch (err) {
    console.error('list accountability partners error:', err);
    res.status(500).json({ error: 'Could not load your accountability partners.' });
  }
}

module.exports = { request, respond, unpair, listRequests, listMine };
