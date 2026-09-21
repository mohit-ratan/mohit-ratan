const pool = require('../db');
const { sendMail } = require('../utils/mailer');
const { notify } = require('./notifications');

// For each active partnership, finds the side that posted or shared a
// story yesterday while their partner did not — so the one who kept up
// can be nudged to check in, rather than piling a reminder onto whoever
// already had a rough day.
async function findMissedPartnerships() {
  const [rows] = await pool.query(`
    SELECT a.requester_id, a.partner_id,
           ur.email AS requester_email, ur.display_name AS requester_name,
           up.email AS partner_email, up.display_name AS partner_name,
           (EXISTS(SELECT 1 FROM posts p WHERE p.author_id = a.requester_id AND DATE(p.created_at) = CURDATE() - INTERVAL 1 DAY)
            OR EXISTS(SELECT 1 FROM stories s WHERE s.author_id = a.requester_id AND DATE(s.created_at) = CURDATE() - INTERVAL 1 DAY)) AS requester_posted,
           (EXISTS(SELECT 1 FROM posts p WHERE p.author_id = a.partner_id AND DATE(p.created_at) = CURDATE() - INTERVAL 1 DAY)
            OR EXISTS(SELECT 1 FROM stories s WHERE s.author_id = a.partner_id AND DATE(s.created_at) = CURDATE() - INTERVAL 1 DAY)) AS partner_posted
    FROM accountability_partners a
    JOIN users ur ON ur.id = a.requester_id
    JOIN users up ON up.id = a.partner_id
    WHERE a.status = 'active'
  `);
  return rows;
}

async function notifyKeptUp(recipientId, missedId, recipientEmail, recipientName, missedName) {
  await notify(recipientId, missedId, 'partner_missed').catch(() => {});
  if (!recipientEmail) return;
  await sendMail({
    to: recipientEmail,
    subject: `🤝 Check in with ${missedName}`,
    html: `
      <p>Hi ${recipientName || 'there'},</p>
      <p>${missedName} didn't post yesterday — a quick nudge from you could help keep your accountability streak going together.</p>
      <p><a href="${process.env.APP_URL || 'http://localhost:4000'}">Open PackSomeWork</a></p>
    `,
  });
}

async function sendAccountabilityReminders() {
  const rows = await findMissedPartnerships();
  let sent = 0;
  for (const row of rows) {
    try {
      if (row.requester_posted && !row.partner_posted) {
        await notifyKeptUp(row.requester_id, row.partner_id, row.requester_email, row.requester_name, row.partner_name);
        sent++;
      } else if (row.partner_posted && !row.requester_posted) {
        await notifyKeptUp(row.partner_id, row.requester_id, row.partner_email, row.partner_name, row.requester_name);
        sent++;
      }
    } catch (err) {
      console.error(`accountability reminder failed for pair ${row.requester_id}/${row.partner_id}:`, err.message);
    }
  }
  return sent;
}

module.exports = { sendAccountabilityReminders, findMissedPartnerships };
