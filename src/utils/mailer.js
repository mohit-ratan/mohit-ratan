const nodemailer = require('nodemailer');
require('dotenv').config();

// Resend is tried first when configured — it works over plain HTTPS, so it's
// unaffected by hosts (like GoDaddy Node.js Hosting) that block outbound SMTP
// entirely. The hosting gateway and then real SMTP are kept as fallbacks: on
// a host where SMTP genuinely works, or on GoDaddy's own loopback gateway,
// those still get a chance if Resend isn't configured or its send fails.
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

// Use HTTPS directly so configured deployments bypass the hosting email relay.
async function sendViaResend({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
    throw new Error('Resend requires RESEND_API_KEY and MAIL_FROM from a verified domain.');
  }
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: toArray(to), subject, html, text: htmlToText(html) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // A timeout here doesn't guarantee Resend never received it, but the
    // caller falls back to another transport on any failure — leaving the
    // user with zero codes is worse than a rare duplicate email.
    throw new Error('Resend connection failed or timed out. Check outbound HTTPS connectivity.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id) {
    // Avoid logging provider payloads which can contain recipient data.
    throw new Error(`Resend send failed (HTTP ${res.status}). Check API key, verified sender, and provider logs.`);
  }
  return { provider: 'resend', messageId: body.id };
}

// Tries Resend, then the hosting gateway, then real SMTP, in that order —
// each only attempted if the previous one is unconfigured or fails, so a
// working fallback is always available if you move off a host that needs
// Resend, or if a configured provider has an outage.
async function sendMail({ to, subject, html }) {
  const failures = [];

  if (process.env.EMAIL_PROVIDER === 'resend' || process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend({ to, subject, html });
    } catch (err) {
      console.warn('[mailer] Resend failed, falling back:', err.message);
      failures.push(`Resend: ${err.message}`);
    }
  }

  try {
    const gatewayResult = await sendViaGateway({ to, subject, html });
    if (gatewayResult) return { ...gatewayResult, provider: 'gateway' };
  } catch (err) {
    console.warn('[mailer] Gateway failed, falling back:', err.message);
    failures.push(`Gateway: ${err.message}`);
  }

  const t = getTransporter();
  if (t) {
    try {
      const result = await t.sendMail({
        from: process.env.MAIL_FROM || '"PackSomeWork" <no-reply@packsomework.com>',
        to,
        subject,
        html,
      });
      return { ...result, provider: 'smtp' };
    } catch (err) {
      console.warn('[mailer] SMTP failed:', err.message);
      failures.push(`SMTP: ${err.message}`);
    }
  }

  const detail = failures.length ? failures.join(' | ') : 'No transport is configured — set RESEND_API_KEY or SMTP_HOST.';
  throw new Error(`Email delivery failed on every available transport. ${detail}`);
}

module.exports = { sendMail };
