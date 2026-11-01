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

// Posts and stories count once per calendar day. Two monthly freeze days
// can cover missed days, including consecutive misses. A third missed day
// resets the streak; a later upload starts at one instead of reviving it.
function startOfLocalDay(ts) {
  const parts = typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts) ? ts.split('-').map(Number) : null;
  const d = parts ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

async function computeStreak(authorId) {
  const [postDates] = await pool.query('SELECT created_at FROM posts WHERE author_id = ?', [authorId]);
  const [storyDates] = await pool.query('SELECT created_at FROM stories WHERE author_id = ?', [authorId]);
  const [freezeRows] = await pool.query('SELECT used_on, created_at FROM streak_freeze_uses WHERE user_id = ? ORDER BY created_at ASC, used_on ASC', [authorId]);
  const today = startOfLocalDay(new Date());
  const timestamps = [...postDates, ...storyDates].map(row => startOfLocalDay(row.created_at)).filter(day => Number.isFinite(day) && day <= today);
  const earliest = timestamps.reduce((minimum, day) => Math.min(minimum, day), Infinity);
  const activeDays = new Set(timestamps);
  const usedDays = new Set();
  const usedByMonth = new Map();
  // Spending belongs to the ledger, even if an older post/story was deleted.
  // Honor the first two claims in each month, never extra legacy claims
  // written by the old month-boundary calculation.
  for (const row of freezeRows) {
    const day = startOfLocalDay(row.used_on);
    if (!Number.isFinite(day) || day >= today || usedDays.has(day)) continue;
    const month = toSqlDate(new Date(day)).slice(0, 7);
    const used = usedByMonth.get(month) || 0;
    if (used >= STREAK_FREEZE_MONTHLY_LIMIT) continue;
    usedDays.add(day);
    usedByMonth.set(month, used + 1);
  }
  const freezeSummary = () => {
    const currentMonth = toSqlDate(new Date()).slice(0, 7);
    const freezesUsedThisMonth = usedByMonth.get(currentMonth) || 0;
    return { freezesUsedThisMonth, freezesRemaining: Math.max(0, STREAK_FREEZE_MONTHLY_LIMIT - freezesUsedThisMonth) };
  };
  if (!timestamps.length) return { streak: 0, ...freezeSummary() };
  // Today remains open until midnight. If not posted yet, evaluate only
  // completed days, so a third miss resets after that day's deadline.
  const end = new Date(today);
  if (!activeDays.has(today)) end.setDate(end.getDate() - 1);
  let streak = 0, missedDays = 0;
  for (const cursor = new Date(earliest); cursor.getTime() <= end.getTime(); cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getTime();
    if (activeDays.has(day)) {
      streak += 1;
      missedDays = 0;
      continue;
    }
    missedDays += 1;
    if (!streak || missedDays > STREAK_FREEZE_MONTHLY_LIMIT) { streak = 0; continue; }
    const month = toSqlDate(cursor).slice(0, 7);
    if (!usedDays.has(day)) {
      const used = usedByMonth.get(month) || 0;
      if (used >= STREAK_FREEZE_MONTHLY_LIMIT) { streak = 0; continue; }
      try {
        await pool.query('INSERT IGNORE INTO streak_freeze_uses (user_id, used_on) VALUES (?, ?)', [authorId, toSqlDate(cursor)]);
      } catch {
        streak = 0;
        continue;
      }
      usedDays.add(day);
      usedByMonth.set(month, used + 1);
    }
    streak += 1;
  }
  return { streak, ...freezeSummary() };
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
