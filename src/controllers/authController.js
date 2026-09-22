const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { sendMail } = require('../utils/mailer');
const { hash, otpHash, securityRow, transaction } = require('../lib/authSecurity');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user, version = 0) {
  return jwt.sign({ sub: user.id, ver: version }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    bio: u.bio,
    photoUrl: u.photo_url,
    emailVerified: !!u.email_verified,
  };
}

// ---- Register (email + password) ----
async function register(req, res) {
  try {
    const { email, password, displayName } = req.body || {};
    if (typeof email !== 'string' || email.length > 255 || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (typeof displayName !== 'string' || !displayName.trim()) {
      return res.status(400).json({ error: 'Enter a display name.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.length) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await pool.query(
      `INSERT INTO users (id, email, password_hash, display_name, verification_token, verification_expires)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, normalizedEmail, passwordHash, displayName.trim().slice(0, 100), token, expires]
    );

    const verifyUrl = `${appUrl()}/verify?token=${token}`;
    let emailSent = false;
    // The account row above already exists regardless of whether this send
    // succeeds, and email verification can also happen via the OTP login
    // flow (see verifyOtp) — so a failure here shouldn't undo registration
    // or turn it into a 500 for the caller.
    try {
      const mailResult = await sendMail({
        to: normalizedEmail,
        subject: 'Verify your PackSomeWork account',
        html: `
          <p>Welcome to PackSomeWork!</p>
          <p>Click the link below to verify your email and finish creating your account:</p>
          <p><a href="${verifyUrl}">${verifyUrl}</a></p>
          <p>This link expires in 24 hours. If you didn't request this, you can ignore this email.</p>
        `,
      });
      console.log('register: verification mail accepted:', mailResult);
      emailSent = true;
    } catch (mailErr) {
      console.error('register: verification email failed to send:', mailErr);
    }

    res.json({ ok: true, emailSent, message: emailSent ? 'Account created. Check your email for a verification link.' : 'Account created, but the verification email could not be sent. Use Resend verification email to try again.' });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
}

// ---- Verify email (link from the registration email) ----
async function verify(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Missing verification token.' });

    const [rows] = await pool.query(
      'SELECT id, verification_expires FROM users WHERE verification_token = ?',
      [token]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'That verification link is invalid or has already been used.' });
    }
    const user = rows[0];
    if (new Date(user.verification_expires) < new Date()) {
      return res.status(400).json({ error: 'That verification link has expired. Request a new verification email.' });
    }

    const [updated] = await pool.query(
      'UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ? AND verification_token = ? AND verification_expires > NOW()',
      [user.id, token]
    );
    if (!updated.affectedRows) return res.status(400).json({ error: 'This link has expired or was already used. Request a new verification email.' });
    res.json({ ok: true, message: 'Email verified! You can now sign in.' });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ error: 'Something went wrong verifying your email.' });
  }
}

// ---- Login with password ----
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!rows.length) return res.status(401).json({ error: 'Incorrect email or password.' });

    const user = rows[0];
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before signing in. Check your inbox for the link.' });
    }

    const version = await transaction(async db => {
      const state = await securityRow(db, user.id);
      const [current] = await db.query('SELECT password_hash FROM users WHERE id = ?', [user.id]);
      if (!current.length || current[0].password_hash !== user.password_hash) return null;
      return state.session_version;
    });
    if (version === null) return res.status(401).json({ error: 'Your password changed. Please sign in again.' });
    const token = issueToken(user, version);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
}

// ---- OTP login: step 1, request a one-time code by email ----
async function requestOtp(req, res) {
  try {
    const { email } = req.body || {};
    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!rows.length) return res.status(400).json({ error: 'Unable to sign in. Check your email or create an account.' });

    const user = rows[0];
    const code = String(crypto.randomInt(100000, 1000000));
    const digest = otpHash(user.id, code);
    await transaction(async db => {
      await securityRow(db, user.id);
      await db.query('UPDATE auth_security SET otp_hash = ?, otp_expires = DATE_ADD(NOW(), INTERVAL 10 MINUTE), otp_attempts = 0 WHERE user_id = ?', [digest, user.id]);
      await db.query('UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?', [user.id]);
    });

    const mailResult = await sendMail({
      to: normalizedEmail,
      subject: 'Your PackSomeWork sign-in code',
      html: `<p>Your one-time sign-in code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    });
    console.log('otp/request: mail sent:', mailResult);

    res.json({ ok: true, message: 'A code has been emailed to you.' });
  } catch (err) {
    console.error('otp/request error:', err);
    res.status(500).json({ error: 'Something went wrong sending your code.' });
  }
}

// ---- OTP login: step 2, verify the code and sign in ----
async function verifyOtp(req, res) {
  try {
    const { email, code } = req.body || {};
    const normalizedEmail = (typeof email === 'string' ? email : '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!rows.length) return res.status(400).json({ error: 'Unable to sign in. Check your email or create an account.' });

    const user = rows[0];
    const result = await transaction(async db => {
      const state = await securityRow(db, user.id);
      if (!state.otp_hash || !state.otp_expires || new Date(state.otp_expires) <= new Date() || state.otp_attempts >= 5) return null;
      const candidate = typeof code === 'string' ? code.trim() : '';
      if (!/^\d{6}$/.test(candidate) || state.otp_hash !== otpHash(user.id, candidate)) {
        await db.query('UPDATE auth_security SET otp_attempts = otp_attempts + 1 WHERE user_id = ?', [user.id]);
        return null;
      }
      await db.query('UPDATE auth_security SET otp_hash = NULL, otp_expires = NULL, otp_attempts = 0 WHERE user_id = ?', [user.id]);
      await db.query('UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?', [user.id]);
      return { version: state.session_version };
    });
    if (!result) return res.status(401).json({ error: 'Invalid, expired, or locked code. Request a new code after the cooldown.' });
    const [fresh] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
    const token = issueToken(user, result.version);
    res.json({ token, user: publicUser(fresh[0]) });
  } catch (err) {
    console.error('otp/verify error:', err);
    res.status(500).json({ error: 'Something went wrong verifying your code.' });
  }
}

// ---- Current signed-in user ----
async function me(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: publicUser(rows[0]) });
  } catch (err) { console.error('Account lookup failed:', err.code); res.status(503).json({ error: 'Could not load your account.' }); }
}

function appUrl() {
  const value = process.env.APP_URL || 'http://localhost:4000';
  if (process.env.NODE_ENV === 'production' && !value.startsWith('https://')) throw new Error('APP_URL must be HTTPS in production.');
  return value.replace(/\/$/, '');
}

async function resendVerification(req, res) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? AND email_verified = 0', [email]);
    if (rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query('UPDATE users SET verification_token = ?, verification_expires = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?', [token, rows[0].id]);
      const url = `${appUrl()}/verify?token=${token}`;
      await sendMail({ to: email, subject: 'Verify your PackSomeWork account', html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p><p>This link expires in 24 hours.</p>` });
    }
    res.json({ message: 'If your account needs verification, a new link has been requested. Check your inbox and spam folder.' });
  } catch (err) { console.error('Resend verification failed:', err.message); res.status(503).json({ error: 'Could not send the verification email. Please try again later.' }); }
}

async function forgotPassword(req, res) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      await transaction(async db => {
        await securityRow(db, rows[0].id);
        await db.query('UPDATE auth_security SET reset_hash = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE user_id = ?', [hash(token), rows[0].id]);
      });
      const url = `${appUrl()}/reset-password?token=${token}`;
      await sendMail({ to: email, subject: 'Reset your PackSomeWork password', html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 30 minutes. Ignore it if you did not request it.</p>` });
    }
    res.json({ message: 'If an account matches this email, a password reset link has been requested.' });
  } catch (err) { console.error('Password reset email failed:', err.message); res.status(503).json({ error: 'Could not process the reset request. Please try again later.' }); }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Use a valid reset link and a password of 8–72 bytes.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const changed = await transaction(async db => {
      const [rows] = await db.query('SELECT user_id FROM auth_security WHERE reset_hash = ? AND reset_expires > NOW() FOR UPDATE', [hash(token)]);
      if (!rows.length) return false;
      const id = rows[0].user_id;
      await db.query('UPDATE users SET password_hash = ?, email_verified = 1, verification_token = NULL, verification_expires = NULL, otp_code = NULL, otp_expires = NULL WHERE id = ?', [passwordHash, id]);
      await db.query('UPDATE auth_security SET reset_hash = NULL, reset_expires = NULL, otp_hash = NULL, otp_expires = NULL, session_version = session_version + 1 WHERE user_id = ?', [id]);
      return true;
    });
    if (!changed) return res.status(400).json({ error: 'This reset link is invalid or expired. Request a new one.' });
    res.json({ message: 'Password updated. Sign in with your new password.' });
  } catch (err) { console.error('Reset password failed:', err.code); res.status(500).json({ error: 'Could not reset your password.' }); }
}
module.exports = { register, verify, login, requestOtp, verifyOtp, me, resendVerification, forgotPassword, resetPassword };
