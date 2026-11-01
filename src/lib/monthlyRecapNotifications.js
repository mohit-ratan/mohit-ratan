const pool = require('../db');
const { ensureMemberTables } = require('./memberFeatures');
const { calendarDay, validTimeZone } = require('./taskCelebration');
const { recapWindow } = require('./monthlyRecap');

async function ensureMonthlyRecapNotification(userId, now = new Date(), savedZone) {
  await ensureMemberTables();
  let zone = savedZone;
  if (zone === undefined) {
    const [preferences] = await pool.query('SELECT time_zone FROM member_preferences WHERE user_id = ?', [userId]);
    zone = preferences[0]?.time_zone;
  }
  zone = validTimeZone(zone);
  const month = recapWindow(zone, null, now).months[0];
  const [existing] = await pool.query('SELECT 1 FROM monthly_recap_notifications WHERE user_id = ? AND month_key = ?', [userId, month]);
  if (existing.length) return false;
  const [year, number] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, number - 1, 1) - 86400000);
  const to = new Date(Date.UTC(year, number, 1) + 86400000);
  const [posts] = await pool.query('SELECT created_at FROM posts WHERE author_id = ? AND created_at >= ? AND created_at < ?', [userId, from, to]);
  if (!posts.some(post => calendarDay(new Date(post.created_at), zone).slice(0, 7) === month)) return false;
  // The unique user/month key makes concurrent jobs and inbox polls idempotent.
  const [result] = await pool.query('INSERT IGNORE INTO monthly_recap_notifications (user_id, month_key) VALUES (?, ?)', [userId, month]);
  return result.affectedRows === 1;
}
async function createMonthlyRecapNotifications(now = new Date()) {
  await ensureMemberTables();
  const [members] = await pool.query(`SELECT u.id, p.time_zone FROM users u
    LEFT JOIN member_preferences p ON p.user_id = u.id WHERE EXISTS (SELECT 1 FROM posts WHERE author_id = u.id)`);
  let count = 0;
  for (const member of members) {
    try { if (await ensureMonthlyRecapNotification(member.id, now, member.time_zone || 'UTC')) count++; }
    catch (error) { console.error('Monthly recap notification failed:', error.code || error.name); }
  }
  return count;
}
module.exports = { ensureMonthlyRecapNotification, createMonthlyRecapNotifications };
