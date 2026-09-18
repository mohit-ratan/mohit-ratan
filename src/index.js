require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const storyRoutes = require('./routes/stories');
const profileRoutes = require('./routes/profile');
const goalRoutes = require('./routes/goals');
const followRoutes = require('./routes/follows');
const userRoutes = require('./routes/users');
const blockRoutes = require('./routes/blocks');
const notificationRoutes = require('./routes/notifications');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serves the built frontend (index.html + hashed JS/CSS) and, at
// /assets/uploads, the media users upload — see public/assets/uploads.
app.use(express.static(publicDir));

// Client-side routing fallback: any non-API GET that isn't a real static
// file falls through to the SPA's index.html.
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Fallback error handler (e.g. multer file-size errors thrown outside routes)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PackSomeWork listening on http://localhost:${PORT}`);
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-long-random-string') {
    console.warn('[warning] JWT_SECRET is not set to a real secret — set one in .env before going live.');
  }
  if (!process.env.SMTP_HOST) {
    console.warn('[warning] SMTP_* is not configured — verification/OTP emails will only be logged, not sent.');
  }
});
