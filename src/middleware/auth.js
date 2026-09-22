const jwt = require('jsonwebtoken');
const pool = require('../db');
const { ensureSecurityTables } = require('../lib/authSecurity');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please sign in.' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ error: 'Your session expired. Please sign in again.' }); }
  try {
    await ensureSecurityTables();
    const [rows] = await pool.query('SELECT u.id, u.email_verified, COALESCE(s.session_version, 0) AS session_version FROM users u LEFT JOIN auth_security s ON s.user_id = u.id WHERE u.id = ?', [payload.sub]);
    if (!rows.length || !rows[0].email_verified || rows[0].session_version !== (payload.ver || 0)) return res.status(401).json({ error: 'Your session expired. Please sign in again.' });
    req.userId = payload.sub;
    next();
  } catch (err) {
    console.error('Session lookup failed:', err.code);
    return res.status(503).json({ error: 'Session service temporarily unavailable.' });
  }
}
module.exports = { requireAuth };
