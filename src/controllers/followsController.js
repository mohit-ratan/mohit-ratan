const pool = require('../db');

// Sends a follow request (or is a no-op if one already exists in either
// state — the caller just gets back whatever the current status now is).
async function follow(req, res) {
  try {
    const followeeId = req.params.id;
    if (followeeId === req.userId) {
      return res.status(400).json({ error: "You can't follow yourself." });
    }
    const [target] = await pool.query('SELECT is_private FROM users WHERE id = ?', [followeeId]);
    if (!target.length) return res.status(404).json({ error: 'User not found.' });
    const isPrivate = !!target[0].is_private;

    const [existing] = await pool.query(
      'SELECT status FROM follows WHERE follower_id = ? AND followee_id = ?',
      [req.userId, followeeId]
    );
    if (existing.length) {
      // A pending request left over from when this account was private —
      // now that it's public, there's nothing left to approve.
      if (existing[0].status === 'pending' && !isPrivate) {
        await pool.query(
          "UPDATE follows SET status = 'accepted' WHERE follower_id = ? AND followee_id = ?",
          [req.userId, followeeId]
        );
        return res.json({ status: 'accepted' });
      }
      return res.json({ status: existing[0].status });
    }

    const status = isPrivate ? 'pending' : 'accepted';
    await pool.query(
      'INSERT INTO follows (follower_id, followee_id, status) VALUES (?, ?, ?)',
      [req.userId, followeeId, status]
    );
    res.json({ status });
  } catch (err) {
    console.error('follow error:', err);
    res.status(500).json({ error: 'Could not send follow request.' });
  }
}

// Cancels a pending request or unfollows an accepted one — same action
// either way from the follower's side.
async function unfollow(req, res) {
  try {
    await pool.query(
      'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?',
      [req.userId, req.params.id]
    );
    res.json({ status: 'none' });
  } catch (err) {
    console.error('unfollow error:', err);
    res.status(500).json({ error: 'Could not update follow status.' });
  }
}

// Only the followee can accept/reject a pending request addressed to them.
async function respond(req, res) {
  try {
    const followerId = req.params.id;
    const { action } = req.body || {};
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }
    const [rows] = await pool.query(
      "SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ? AND status = 'pending'",
      [followerId, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No pending request from this user.' });

    if (action === 'accept') {
      await pool.query(
        "UPDATE follows SET status = 'accepted' WHERE follower_id = ? AND followee_id = ?",
        [followerId, req.userId]
      );
    } else {
      await pool.query(
        'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?',
        [followerId, req.userId]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('respond to follow error:', err);
    res.status(500).json({ error: 'Could not update that request.' });
  }
}

// Pending requests waiting on the signed-in user's approval.
async function listRequests(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url, f.created_at
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.followee_id = ? AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
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
    console.error('list follow requests error:', err);
    res.status(500).json({ error: 'Could not load follow requests.' });
  }
}

module.exports = { follow, unfollow, respond, listRequests };
