const pool = require('../db');
const { getFollowStatus } = require('../lib/follows');
const { uploadMedia, deleteMedia } = require('../lib/storage');

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Consecutive-day streak (posts + stories count), with a one-day grace
// period: posting yesterday but not yet today still shows an active streak.
async function computeStreak(authorId) {
  const [postDates] = await pool.query('SELECT created_at FROM posts WHERE author_id = ?', [authorId]);
  const [storyDates] = await pool.query('SELECT created_at FROM stories WHERE author_id = ?', [authorId]);

  const days = new Set();
  postDates.forEach(r => days.add(dateKey(r.created_at)));
  storyDates.forEach(r => days.add(dateKey(r.created_at)));

  const cursor = new Date();
  if (!days.has(dateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dateKey(cursor.getTime()))) return 0;
  }
  let streak = 0;
  while (days.has(dateKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, display_name, bio, photo_url, is_private FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    const u = rows[0];
    const streak = await computeStreak(req.params.id);
    const followStatus = await getFollowStatus(req.userId, req.params.id);
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
      followStatus,
      blockedByMe,
    });
  } catch (err) {
    console.error('get profile error:', err);
    res.status(500).json({ error: 'Could not load profile.' });
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

module.exports = { getProfile, updateProfile, uploadPhoto, deletePhoto };
