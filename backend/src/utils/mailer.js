const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

// Sends a real email when SMTP_* is configured in .env. Without it, the
// message is only logged to the console — useful for local dev, but
// registration/verification/OTP need real SMTP settings to actually work
// for your users. See .env.example for options (GoDaddy email, Gmail App
// Password, SendGrid, Mailgun, Resend, Postmark, etc).
async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[mailer] SMTP not configured — email NOT actually sent to ${to}.`);
    console.log(`[mailer] Subject: ${subject}\n${html}\n`);
    return { skipped: true };
  }
  return t.sendMail({
    from: process.env.MAIL_FROM || '"PackSomeWork" <no-reply@packsomework.com>',
    to,
    subject,
    html,
  });
}

module.exports = { sendMail };
