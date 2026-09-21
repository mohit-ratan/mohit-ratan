const pool = require('../db');
const { sendMail } = require('../utils/mailer');

// "At risk" = shared something yesterday (so there's an active streak worth
// protecting) but hasn't yet today. Uses the server's local date — there's
// no per-user timezone stored yet, so this is an approximation rather than
// each user's exact midnight.
async function findAtRiskUsers() {
  const [rows] = await pool.query(`
    SELECT DISTINCT u.id, u.email, u.display_name FROM users u
    WHERE u.email_verified = 1
    AND (
      EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND DATE(p.created_at) = CURDATE() - INTERVAL 1 DAY)
      OR EXISTS (SELECT 1 FROM stories s WHERE s.author_id = u.id AND DATE(s.created_at) = CURDATE() - INTERVAL 1 DAY)
    )
    AND NOT EXISTS (SELECT 1 FROM posts p2 WHERE p2.author_id = u.id AND DATE(p2.created_at) = CURDATE())
    AND NOT EXISTS (SELECT 1 FROM stories s2 WHERE s2.author_id = u.id AND DATE(s2.created_at) = CURDATE())
  `);
  return rows;
}

async function sendStreakReminders() {
  const users = await findAtRiskUsers();
  for (const user of users) {
    try {
      await sendMail({
        to: user.email,
        subject: '🔥 Your streak is about to reset',
        html: `
          <p>Hi ${user.display_name || 'there'},</p>
          <p>You shared something on PackSomeWork yesterday, but not yet today — share a photo or video before the day ends to keep your streak going.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:4000'}">Open PackSomeWork</a></p>
        `,
      });
    } catch (err) {
      console.error(`streak reminder failed for user ${user.id}:`, err.message);
    }
  }
  return users.length;
}

module.exports = { sendStreakReminders, findAtRiskUsers };
