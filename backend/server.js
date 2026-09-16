require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const storyRoutes = require('./src/routes/stories');
const profileRoutes = require('./src/routes/profile');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/profile', profileRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Fallback error handler (e.g. multer file-size errors thrown outside routes)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PackSomeWork API listening on http://localhost:${PORT}`);
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-long-random-string') {
    console.warn('[warning] JWT_SECRET is not set to a real secret — set one in .env before going live.');
  }
  if (!process.env.SMTP_HOST) {
    console.warn('[warning] SMTP_* is not configured — verification/OTP emails will only be logged, not sent.');
  }
});
