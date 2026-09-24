const pool = require('../db');
const { canView } = require('../lib/follows');
const { isBlocked } = require('../lib/blocks');
const { notify } = require('../lib/notifications');
const { normalizeTasks } = require('../lib/goalProgress');

// Sends a follow request (or is a no-op if one already exists in either
// state — the caller just gets back whatever the current status now is).
async function follow(req, res) {
  try {
    const followeeId = req.params.id;
    if (followeeId === req.userId) {
      return res.status(400).json({ error: "You can't follow yourself." });
    }
    if (await isBlocked(req.userId, followeeId)) {
      return res.status(403).json({ error: 'You cannot follow this account.' });
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
      await notify(followerId, req.userId, 'follow_accepted');
      // If I already follow them back (e.g. they were following-back a
      // request I originally sent), this pair is already mutual — the
      // "follow back?" prompt would be pointless, so tell the client not
      // to show it.
      const [alreadyMutual] = await pool.query(
        "SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ? AND status = 'accepted'",
        [req.userId, followerId]
      );
      return res.json({ ok: true, alreadyFollowingBack: alreadyMutual.length > 0 });
    }
    await pool.query(
      'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?',
      [followerId, req.userId]
    );
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

// People who follow :id — same privacy rule as their posts/stories: only
// visible to the account owner, an accepted follower, or if it's public.
async function listFollowers(req, res) {
  try {
    const targetId = req.params.id;
    if (!(await canView(req.userId, targetId))) return res.json({ users: [] });
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.followee_id = ? AND f.status = 'accepted'
       ORDER BY u.display_name ASC`,
      [targetId]
    );
    res.json({ users: rows.map((u) => ({ id: u.id, displayName: u.display_name, photoUrl: u.photo_url })) });
  } catch (err) {
    console.error('list followers error:', err);
    res.status(500).json({ error: 'Could not load followers.' });
  }
}

// People :id follows.
async function listFollowing(req, res) {
  try {
    const targetId = req.params.id;
    if (!(await canView(req.userId, targetId))) return res.json({ users: [] });
    const [rows] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url FROM follows f
       JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? AND f.status = 'accepted'
       ORDER BY u.display_name ASC`,
      [targetId]
    );
    res.json({ users: rows.map((u) => ({ id: u.id, displayName: u.display_name, photoUrl: u.photo_url })) });
  } catch (err) {
    console.error('list following error:', err);
    res.status(500).json({ error: 'Could not load following.' });
  }
}

// Me plus everyone I follow, each represented by their single
// closest-to-finishing active (incomplete) goal, ranked with the
// nearest-to-done first — so I can see my own standing among the people
// I follow, not just theirs. There's no fixed order stored anywhere —
// it's recomputed from live progress on every request, so the ranking
// naturally reshuffles as people actually make (or don't make) progress,
// rather than sitting in a static list.
async function followingProgress(req, res) {
  try {
    const [followees] = await pool.query(
      `SELECT u.id, u.display_name, u.photo_url FROM follows f
       JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? AND f.status = 'accepted'`,
      [req.userId]
    );
    const [meRows] = await pool.query('SELECT id, display_name, photo_url FROM users WHERE id = ?', [req.userId]);
    const everyone = meRows.length ? [...followees, meRows[0]] : followees;
    if (!everyone.length) return res.json({ people: [] });
    const ids = everyone.map((f) => f.id);
    const placeholders = ids.map(() => '?').join(',');

    const [goalRows] = await pool.query(
      `SELECT author_id, tag, target_date, subtasks FROM goals WHERE author_id IN (${placeholders})`,
      ids
    );
    const [postRows] = await pool.query(
      `SELECT author_id, tag, category FROM posts WHERE author_id IN (${placeholders}) AND tag IS NOT NULL AND tag <> ''`,
      ids
    );

    const categoryCounts = new Map(); // `${authorId}:${tag}` -> { category: count }
    for (const r of postRows) {
      const key = `${r.author_id}:${r.tag}`;
      const counts = categoryCounts.get(key) || {};
      counts[r.category] = (counts[r.category] || 0) + 1;
      categoryCounts.set(key, counts);
    }

    const goalsByAuthor = new Map();
    for (const g of goalRows) {
      if (!goalsByAuthor.has(g.author_id)) goalsByAuthor.set(g.author_id, []);
      goalsByAuthor.get(g.author_id).push(g);
    }

    const people = everyone.map((u) => {
      const goals = goalsByAuthor.get(u.id) || [];
      let best = null;
      for (const g of goals) {
        const tasks = normalizeTasks(g.subtasks);
        if (!tasks.length || tasks.every((t) => t.done)) continue; // only active goals
        const { completed, target } = tasks.reduce(
          (acc, t) => ({ completed: acc.completed + t.completedDays, target: acc.target + t.targetDays }),
          { completed: 0, target: 0 }
        );
        const percent = target ? Math.round((completed / target) * 100) : 0;
        if (!best || percent > best.percent) {
          const counts = categoryCounts.get(`${u.id}:${g.tag}`);
          const category = counts ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : 'health';
          best = { tag: g.tag, category, percent, completedDays: completed, targetDays: target, targetDate: g.target_date ? new Date(g.target_date).toISOString().slice(0, 10) : null };
        }
      }
      if (!best) return null;
      return { id: u.id, displayName: u.display_name, photoUrl: u.photo_url, isMe: u.id === req.userId, goal: best };
    }).filter(Boolean);

    people.sort((a, b) => b.goal.percent - a.goal.percent);
    res.json({ people });
  } catch (err) {
    console.error('following progress error:', err);
    res.status(500).json({ error: 'Could not load progress for people you follow.' });
  }
}

module.exports = { follow, unfollow, respond, listRequests, listFollowers, listFollowing, followingProgress };
