const pool = require('../db');
const { getFollowStatus, canView } = require('../lib/follows');
const { getPartnerStatus } = require('../lib/accountability');
const { uploadMedia, deleteMedia } = require('../lib/storage');

const ACTIVITY_DAYS = 98; // 14 full weeks, matching the heatmap grid
const STREAK_FREEZE_MONTHLY_LIMIT = 2;

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function toSqlDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Consecutive-day streak (posts + stories count). Today gets an
// unconditional, unlimited one-day grace (posting yesterday but not yet
// today still shows an active streak) — separate from and in addition to
// the streak-freeze allowance below, which only ever covers a genuinely
// past missed day, not "haven't gotten to it yet today".
//
// A streak freeze auto-covers one missed day at a time, up to
// STREAK_FREEZE_MONTHLY_LIMIT per calendar month, the first time that gap
// is encountered — recorded permanently in streak_freeze_uses so it's
// consumed once, not re-spent (or un-spent) on every recomputation.
function startOfLocalDay(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

async function computeStreak(authorId) {
  const [postDates] = await pool.query('SELECT created_at FROM posts WHERE author_id = ?', [authorId]);
  const [storyDates] = await pool.query('SELECT created_at FROM stories WHERE author_id = ?', [authorId]);
  const [freezeRows] = await pool.query('SELECT used_on FROM streak_freeze_uses WHERE user_id = ?', [authorId]);

  const realDayTimestamps = [...postDates, ...storyDates].map((r) => startOfLocalDay(r.created_at));
  if (!realDayTimestamps.length) return { streak: 0, freezesUsedThisMonth: 0, freezesRemaining: STREAK_FREEZE_MONTHLY_LIMIT };
  // A freeze can only bridge a gap BETWEEN real activity — it must never
  // extend a streak into days before the account's very first post/story,
  // or a brand-new user's single upload would auto-freeze its way to a
  // multi-day streak out of nothing.
  const earliestActiveMs = realDayTimestamps.reduce((min, ts) => Math.min(min, ts), Infinity);

  const activeDays = new Set();
  postDates.forEach(r => activeDays.add(dateKey(r.created_at)));
  storyDates.forEach(r => activeDays.add(dateKey(r.created_at)));
  // Freeze rows from before this fix may have recorded invalid pre-history
  // freezes; only honor ones that actually fall on/after the real start.
  const validFreezeRows = freezeRows.filter((r) => startOfLocalDay(r.used_on) >= earliestActiveMs);
  validFreezeRows.forEach(r => activeDays.add(dateKey(r.used_on)));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  let freezesUsedThisMonth = validFreezeRows.filter((r) => new Date(r.used_on) >= monthStart).length;
  const freezesRemaining = () => Math.max(0, STREAK_FREEZE_MONTHLY_LIMIT - freezesUsedThisMonth);

  const cursor = new Date();
  if (!activeDays.has(dateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDays.has(dateKey(cursor.getTime()))) {
      return { streak: 0, freezesUsedThisMonth, freezesRemaining: freezesRemaining() };
    }
  }

  let streak = 0;
  while (startOfLocalDay(cursor.getTime()) >= earliestActiveMs) {
    const key = dateKey(cursor.getTime());
    if (activeDays.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }
    if (freezesUsedThisMonth >= STREAK_FREEZE_MONTHLY_LIMIT) break;
    try {
      await pool.query('INSERT INTO streak_freeze_uses (user_id, used_on) VALUES (?, ?)', [authorId, toSqlDate(cursor)]);
    } catch {
      break; // table missing locally, or a genuine race — treat the streak as broken here
    }
    freezesUsedThisMonth++;
    activeDays.add(key);
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, freezesUsedThisMonth, freezesRemaining: freezesRemaining() };
}

async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, display_name, bio, photo_url, is_private FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    const u = rows[0];
    const { streak, freezesUsedThisMonth, freezesRemaining } = await canView(req.userId, req.params.id)
      ? await computeStreak(req.params.id) : { streak: 0, freezesUsedThisMonth: 0, freezesRemaining: 0 };
    const followStatus = await getFollowStatus(req.userId, req.params.id);
    const partnerStatus = await getPartnerStatus(req.userId, req.params.id);
    let blockedByMe = false;
    if (req.userId !== req.params.id) {
      const [blockRows] = await pool.query(
        'SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
        [req.userId, req.params.id]
      );
      blockedByMe = blockRows.length > 0;
    }

    res.json({
      user: { id: u.id, displayName: u.display_name, bio: u.bio, photoUrl: u.photo_url, isPrivate: !!u.is_private },
      streak,
      freezesUsedThisMonth,
      freezesRemaining,
      followStatus,
      partnerStatus,
      blockedByMe,
    });
  } catch (err) {
    console.error('get profile error:', err);
    res.status(500).json({ error: 'Could not load profile.' });
  }
}

// Daily post+story counts for the last ~14 weeks, for a GitHub-style
// consistency heatmap — respects the same privacy rule as everything else.
async function getActivity(req, res) {
  try {
    if (!(await canView(req.userId, req.params.id))) return res.json({ activity: [] });
    const [rows] = await pool.query(
      `SELECT DATE(created_at) as d, COUNT(*) as c FROM (
         SELECT created_at FROM posts WHERE author_id = ? AND created_at >= CURDATE() - INTERVAL ? DAY
         UNION ALL
         SELECT created_at FROM stories WHERE author_id = ? AND created_at >= CURDATE() - INTERVAL ? DAY
       ) combined
       GROUP BY DATE(created_at)`,
      [req.params.id, ACTIVITY_DAYS, req.params.id, ACTIVITY_DAYS]
    );
    res.json({
      activity: rows.map((r) => ({
        date: r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10),
        count: Number(r.c),
      })),
    });
  } catch (err) {
    console.error('get activity error:', err);
    res.status(500).json({ error: 'Could not load activity history.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { displayName, bio, isPrivate } = req.body || {};
    await pool.query(
      'UPDATE users SET display_name = ?, bio = ?, is_private = ? WHERE id = ?',
      [(displayName || 'Anonymous').trim().slice(0, 100), (bio || '').trim().slice(0, 220), isPrivate === false ? 0 : 1, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('update profile error:', err);
    res.status(500).json({ error: 'Could not save your profile.' });
  }
}

// Called after upload.single('photo') middleware has already run.
async function uploadPhoto(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach an image.' });
    if (!req.file.mimetype.startsWith('image')) {
      return res.status(400).json({ error: 'Please choose an image file.' });
    }
    const [existing] = await pool.query('SELECT photo_url FROM users WHERE id = ?', [req.userId]);
    const url = await uploadMedia(req.file.buffer, req.file.originalname, req.file.mimetype, 'avatars');
    await pool.query('UPDATE users SET photo_url = ? WHERE id = ?', [url, req.userId]);
    if (existing[0]?.photo_url) await deleteMedia(existing[0].photo_url).catch(() => {});
    res.json({ ok: true, photoUrl: url });
  } catch (e) {
    console.error('upload photo error:', e);
    res.status(500).json({ error: 'Could not save your photo.' });
  }
}

async function deletePhoto(req, res) {
  try {
    const [existing] = await pool.query('SELECT photo_url FROM users WHERE id = ?', [req.userId]);
    await pool.query('UPDATE users SET photo_url = NULL WHERE id = ?', [req.userId]);
    if (existing[0]?.photo_url) await deleteMedia(existing[0].photo_url).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error('remove photo error:', err);
    res.status(500).json({ error: 'Could not remove your photo.' });
  }
}

module.exports = { getProfile, getActivity, updateProfile, uploadPhoto, deletePhoto, computeStreak };
