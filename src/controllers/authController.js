const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { sendMail } = require('../utils/mailer');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
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
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!displayName || !displayName.trim()) {
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

    const verifyUrl = `${process.env.APP_URL || 'http://localhost:4000'}/verify?token=${token}`;
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
      console.log('register: verification mail sent:', mailResult);
    } catch (mailErr) {
      console.error('register: verification email failed to send:', mailErr);
    }

    res.json({ ok: true, message: 'Account created. Check your email for a verification link before signing in.' });
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
      return res.status(400).json({ error: 'That verification link has expired. Please register again.' });
    }

    await pool.query(
      'UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?',
      [user.id]
    );
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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!rows.length) return res.status(401).json({ error: 'Incorrect email or password.' });

    const user = rows[0];
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before signing in. Check your inbox for the link.' });
    }

    const token = issueToken(user);
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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!rows.length) return res.status(404).json({ error: 'No account exists with that email.' });

    const user = rows[0];
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 1000 * 60 * 10); // 10 min

    await pool.query('UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?', [code, expires, user.id]);

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
    const normalizedEmail = (email || '').trim().toLowerCase();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!rows.length) return res.status(404).json({ error: 'No account exists with that email.' });

    const user = rows[0];
    if (!user.otp_code || !code || user.otp_code !== String(code).trim()) {
      return res.status(401).json({ error: 'Incorrect code.' });
    }
    if (new Date(user.otp_expires) < new Date()) {
      return res.status(401).json({ error: 'That code has expired. Request a new one.' });
    }

    // A verified OTP also proves the email is reachable, so this can double
    // as email verification for accounts created but never confirmed.
    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires = NULL, email_verified = 1 WHERE id = ?',
      [user.id]
    );
    const [fresh] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
    const token = issueToken(user);
    res.json({ token, user: publicUser(fresh[0]) });
  } catch (err) {
    console.error('otp/verify error:', err);
    res.status(500).json({ error: 'Something went wrong verifying your code.' });
  }
}

// ---- Current signed-in user ----
async function me(req, res) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!rows.length) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(rows[0]) });
}

module.exports = { register, verify, login, requestOtp, verifyOtp, me };
