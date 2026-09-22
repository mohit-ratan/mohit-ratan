const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { transaction, ensureSecurityTables } = require('../lib/authSecurity');
const { deleteMedia } = require('../lib/storage');

async function drainMediaDeletionQueue() {
  await ensureSecurityTables();
  const [rows] = await pool.query('SELECT url FROM media_deletion_queue ORDER BY created_at LIMIT 100');
  for (const row of rows) {
    try {
      await deleteMedia(row.url);
      await pool.query('DELETE FROM media_deletion_queue WHERE url = ?', [row.url]);
    } catch (err) { console.error('Media cleanup pending:', err.code || err.name); }
  }
}
async function deleteAccount(req, res) {
  try {
    const password = req.body?.password;
    if (req.body?.confirmation !== 'DELETE' || typeof password !== 'string') return res.status(400).json({ error: 'Enter your password and type DELETE to confirm.' });
    const removed = await transaction(async db => {
      const [users] = await db.query('SELECT password_hash, photo_url FROM users WHERE id = ? FOR UPDATE', [req.userId]);
      if (!users.length || !(await bcrypt.compare(password, users[0].password_hash))) return false;
      const [media] = await db.query('SELECT media_url AS url FROM posts WHERE author_id = ? UNION SELECT media_url AS url FROM stories WHERE author_id = ?', [req.userId, req.userId]);
      if (users[0].photo_url) media.push({ url: users[0].photo_url });
      for (const item of media) await db.query('INSERT IGNORE INTO media_deletion_queue (url) VALUES (?)', [item.url]);
      await db.query('DELETE FROM support_reports WHERE user_id = ?', [req.userId]);
      await db.query('DELETE FROM users WHERE id = ?', [req.userId]);
      return true;
    });
    if (!removed) return res.status(401).json({ error: 'Incorrect password. Use password reset if needed.' });
    res.json({ ok: true, message: 'Account deleted. Associated media is queued for removal.' });
    drainMediaDeletionQueue().catch(err => console.error('Media cleanup unavailable:', err.code));
  } catch (err) { console.error('Delete account failed:', err.code); res.status(500).json({ error: 'Could not delete your account. Please try again.' }); }
}
async function report(req, res) {
  try {
    const { kind, message } = req.body || {};
    if (!['help', 'content', 'privacy'].includes(kind) || typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) return res.status(400).json({ error: 'Choose a topic and enter 10–2000 characters.' });
    const id = uuidv4();
    await pool.query('INSERT INTO support_reports (id, user_id, kind, message) VALUES (?, ?, ?, ?)', [id, req.userId, kind, message.trim()]);
    console.info('Support report received:', id);
    res.json({ message: `Request saved. Reference: ${id}` });
  } catch (err) { console.error('Report failed:', err.code); res.status(500).json({ error: 'Could not save your request. Please try again.' }); }
}
module.exports = { deleteAccount, report, drainMediaDeletionQueue };
