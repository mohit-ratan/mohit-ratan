const nodemailer = require('nodemailer');
require('dotenv').config();

// GoDaddy Node.js Hosting blocks outbound SMTP entirely (nodemailer/external
// SMTP connections fail with EACCES) and instead exposes a loopback-only
// HTTP gateway inside the container for transactional email. Try that
// first; a connection failure means the gateway isn't present (e.g. local
// dev), so fall back to real SMTP or, absent that, logging to the console.
// An actual gateway error (bad request, rate limit, etc) is a real failure
// and is thrown rather than masked by falling back to SMTP, which is
// blocked on this host anyway.
const EMAIL_GATEWAY_URL = 'http://127.0.0.1:2525/api/email/send';

// Strips the small amount of markup our own email templates use so the
// gateway always gets a plain-text body alongside the HTML one, matching
// what GoDaddy's own reference sender always provides.
function htmlToText(html) {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>.*?<\/a>/gi, '$1')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Ported from GoDaddy's own reference implementation
// (tests/fixtures/email-helper/email.cjs in godaddy/nodejs-hosting-agent-skill)
// — the gateway requires to/cc/bcc as arrays even for a single address and
// rejects a bare string with a generic "request invalid".
function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

async function sendViaGateway({ to, subject, html }) {
  const payload = { to: toArray(to), subject, html, text: htmlToText(html) };

  let res;
  let body;
  try {
    res = await fetch(EMAIL_GATEWAY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
    body = await res.json().catch(() => ({}));
  } catch {
    return null; // gateway not reachable — not on this platform
  }
  if (!res.ok || !body.success) {
    throw new Error(`Email gateway responded ${res.status}: ${body.error || 'unknown error'}`);
  }
  return { messageId: body.messageId };
}

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
  const gatewayResult = await sendViaGateway({ to, subject, html });
  if (gatewayResult) return gatewayResult;

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
