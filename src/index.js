require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { sendPersonalReminders } = require('./lib/personalReminders');
const { ensureMemberTables } = require('./lib/memberFeatures');
const memberController = require('./controllers/memberController');
const journalController = require('./controllers/journalController');
const { uploadSingle } = require('./upload');
const { sendAccountabilityReminders } = require('./lib/accountabilityReminders');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const storyRoutes = require('./routes/stories');
const profileRoutes = require('./routes/profile');
const goalRoutes = require('./routes/goals');
const followRoutes = require('./routes/follows');
const userRoutes = require('./routes/users');
const blockRoutes = require('./routes/blocks');
const notificationRoutes = require('./routes/notifications');
const accountabilityRoutes = require('./routes/accountability');

const { ensureSecurityTables, rateLimit } = require('./lib/authSecurity');
const { requireAuth } = require('./middleware/auth');
const { deleteAccount, report, drainMediaDeletionQueue } = require('./controllers/accountController');
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || /change-this|placeholder|your.secret/i.test(secret)) throw new Error('Set a strong JWT_SECRET of at least 32 characters before starting production.');
  const url = new URL(process.env.APP_URL || 'http://localhost');
  if (url.protocol !== 'https:' || /^(localhost|127\.0\.0\.1)$/.test(url.hostname)) throw new Error('Set APP_URL to the public HTTPS origin before starting production.');
}
const app = express();
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (Number.isInteger(proxyHops) && proxyHops > 0) app.set('trust proxy', proxyHops);
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Frame-Options', 'DENY');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
const publicDir = path.join(__dirname, '..', 'public');

app.use(cors());
app.use(express.json());

app.delete('/api/account', requireAuth, rateLimit('delete-account', 5, 900), deleteAccount);
app.post('/api/support', requireAuth, rateLimit('support', 5, 3600), report);
app.get('/api/journal', requireAuth, journalController.list);
app.post('/api/journal', requireAuth, rateLimit('journal', 30, 3600), uploadSingle('photo'), journalController.create);
app.get('/api/journal/:id/photo', requireAuth, journalController.photo);
app.delete('/api/journal/:id', requireAuth, journalController.remove);
app.get('/api/member/dashboard', requireAuth, memberController.dashboard);
app.put('/api/member/preferences', requireAuth, memberController.preferences);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/partners', accountabilityRoutes);

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
Promise.all([ensureSecurityTables(), ensureMemberTables()]).then(() => {
  app.listen(PORT, () => console.log(`PackSomeWork listening on port ${PORT}`));
  drainMediaDeletionQueue().catch(err => console.error('Media cleanup failed:', err.code));
}).catch(err => { console.error('Security schema initialization failed:', err.code); poolShutdown(); process.exit(1); });
function poolShutdown() { require('./db').end(); }
cron.schedule('*/15 * * * *', () => {
  drainMediaDeletionQueue().catch(err => console.error('Media cleanup failed:', err.code));
  require('./db').query('DELETE FROM auth_rate_limits WHERE expires_at < NOW() - INTERVAL 1 DAY').catch(err => console.error('Rate cleanup failed:', err.code));
});

// Personal reminders are opt-in and evaluated in each member's timezone.
if (process.env.DISABLE_REMINDERS !== 'true') cron.schedule('*/5 * * * *', () => {
  sendPersonalReminders().catch(err => console.error('Personal reminders failed:', err.code));
});

if (process.env.DISABLE_REMINDERS !== 'true') cron.schedule('10 19 * * *', () => {
  sendAccountabilityReminders()
    .then((count) => console.log(`[accountability-reminders] sent to ${count} partner(s)`))
    .catch((err) => console.error('[accountability-reminders] job failed:', err));
});
