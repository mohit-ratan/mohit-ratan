const crypto = require('crypto');
const pool = require('../db');
let ready;
function ensureSecurityTables() {
  if (!ready) ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS auth_security (
      user_id VARCHAR(36) PRIMARY KEY,
      session_version INT NOT NULL DEFAULT 0,
      otp_hash CHAR(64) DEFAULT NULL,
      otp_expires DATETIME DEFAULT NULL,
      otp_attempts INT NOT NULL DEFAULT 0,
      reset_hash CHAR(64) DEFAULT NULL,
      reset_expires DATETIME DEFAULT NULL, INDEX idx_auth_reset (reset_hash),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
    await pool.query(`CREATE TABLE IF NOT EXISTS auth_rate_limits (
      bucket CHAR(64) PRIMARY KEY, hits INT NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL, INDEX idx_rate_expiry (expires_at)
    ) ENGINE=InnoDB`);
    await pool.query(`CREATE TABLE IF NOT EXISTS support_reports (
      id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) DEFAULT NULL,
      kind VARCHAR(20) NOT NULL, message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
    await pool.query(`CREATE TABLE IF NOT EXISTS media_deletion_queue (
      url VARCHAR(500) PRIMARY KEY, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
  })().catch(err => { ready = null; throw err; });
  return ready;
}
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const otpHash = (userId, code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${userId}:${code}`).digest('hex');
async function securityRow(db, userId) {
  await db.query('INSERT INTO auth_security (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)', [userId]);
  const [rows] = await db.query('SELECT * FROM auth_security WHERE user_id = ? FOR UPDATE', [userId]);
  return rows[0];
}
async function transaction(fn) {
  await ensureSecurityTables();
  // MySQL may choose a deadlock victim when FK checks and row updates race.
  // Callbacks contain database operations only; rollback makes retries safe.
  for (let attempt = 0; attempt < 5; attempt++) {
    const db = await pool.getConnection();
    try { await db.beginTransaction(); const result = await fn(db); await db.commit(); return result; }
    catch (err) {
      await db.rollback();
      if (err.code !== 'ER_LOCK_DEADLOCK' || attempt === 4) throw err;
    } finally { db.release(); }
  }
}
// Persisted limits work across workers and restarts. Hash identifiers so no emails/IPs are stored here.
async function consumeLimit(key, maximum, seconds) {
  return transaction(async db => {
    const bucket = hash(key);
    await db.query('INSERT INTO auth_rate_limits (bucket, hits, expires_at) VALUES (?, 0, DATE_ADD(NOW(), INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE bucket = VALUES(bucket)', [bucket, seconds]);
    const [rows] = await db.query('SELECT hits, expires_at <= NOW() AS expired FROM auth_rate_limits WHERE bucket = ? FOR UPDATE', [bucket]);
    const hits = rows[0].expired ? 0 : rows[0].hits;
    if (hits >= maximum) return false;
    await db.query('UPDATE auth_rate_limits SET hits = ?, expires_at = IF(expires_at <= NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND), expires_at) WHERE bucket = ?', [hits + 1, seconds, bucket]);
    return true;
  });
}
function rateLimit(name, maximum = 10, seconds = 900) {
  return async (req, res, next) => {
    try {
      // Do not trust arbitrary forwarding headers. Configure TRUST_PROXY_HOPS only for a known proxy topology.
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 255) : req.userId;
      const ipAllowed = await consumeLimit(`${name}:ip:${ip}`, maximum * 5, seconds);
      const identityAllowed = !email || await consumeLimit(`${name}:identity:${email}`, maximum, seconds);
      if (!ipAllowed || !identityAllowed) {
        res.set('Retry-After', String(seconds));
        return res.status(429).json({ error: 'Too many attempts. Please wait before trying again.' });
      }
      next();
    } catch (err) { console.error('Auth limit unavailable:', err.code); res.status(503).json({ error: 'Sign-in service temporarily unavailable. Please try again later.' }); }
  };
}
module.exports = { ensureSecurityTables, hash, otpHash, securityRow, transaction, rateLimit, consumeLimit };
