# PackSomeWork — full-stack app

A social feed for health, wealth, and relationships — photos and videos only, with
an on-device "AI look" photo styler, 24-hour stories, streaks, and real email/OTP
authentication.

This is a complete rewrite of the original single-file prototype as a proper
three-tier app:

- **frontend/** — React 19 + Vite. Talks to the API over HTTP.
- **backend/** — Node.js + Express REST API. Handles auth, posts, stories, profiles, and file uploads.
- **MySQL** — stores everything (see `backend/schema.sql`).

Nothing here is deployed anywhere — it's yours to host wherever you like (a VPS,
your own server, Render/Railway/Fly.io, etc.), then point packsomework.com's DNS
at it.

## 1. Set up MySQL

Create a database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE packsomework CHARACTER SET utf8mb4;"
mysql -u root -p packsomework < backend/schema.sql
```

It's best practice not to run the app as the MySQL `root` user. Create a
dedicated user instead:

```sql
CREATE USER 'packsomework'@'localhost' IDENTIFIED BY 'choose-a-real-password';
GRANT ALL PRIVILEGES ON packsomework.* TO 'packsomework'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Configure and run the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

- `JWT_SECRET` — generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — match what you created above
- `APP_URL` — where the **frontend** will be reachable (used to build the
  email-verification link, e.g. `https://packsomework.com` in production)
- `SMTP_*` — real credentials for sending verification emails and OTP codes.
  Any standard SMTP provider works: your GoDaddy email hosting, Gmail (with an
  App Password), SendGrid, Mailgun, Resend, Postmark, etc. **Without these set,
  the server logs the email content to its console instead of sending it** —
  fine for local testing, but real users need real email delivery.

Then run it:

```bash
npm run dev      # auto-restarts on changes (nodemon)
# or
npm start
```

The API listens on `http://localhost:4000` by default (`GET /api/health`
should return `{"ok":true}`). Uploaded photos/videos are written to
`backend/uploads/` and served at `/uploads/...`.

## 3. Configure and run the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Edit `.env.local` if your API isn't at `http://localhost:4000`:

```
VITE_API_URL=http://localhost:4000
```

Then run it:

```bash
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Register an
account, verify the email (or read the verification link from the backend's
console log if SMTP isn't configured yet), and sign in.

For production, `npm run build` outputs static files in `frontend/dist/` that
can be served by any static host or web server (nginx, Caddy, Netlify,
Vercel, etc.) — just make sure `VITE_API_URL` points at wherever the backend
ends up running, and that the backend's `APP_URL` points back at wherever the
frontend ends up running.

## What's implemented

- **Auth**: registration with bcrypt-hashed passwords, real email verification
  links, password login, and a 6-digit email OTP login — no fake or
  client-side-only auth.
- **Posts & stories**: photo/video only (text-only posts are rejected server-side,
  matching the original product rule), category tagging (Health/Wealth/
  Relationships), one optional hashtag, stories that auto-expire after 24 hours.
- **AI look**: a client-side canvas engine (filters, tint, vignette, grain, glow)
  applied to photos before upload — ported from the original prototype, not a
  real generative model.
- **Streaks**: consecutive-day posting/story streak with a one-day grace period,
  computed server-side.
- **Profiles**: display name, bio, profile photo, per-user post grid.
- **Feed**: category filter, tag filter, trending tags, live search, likes,
  comments.

## Notes on security

- Passwords are hashed with bcrypt (cost factor 12) — never stored in plain text.
- JWTs are used for session auth (`Authorization: Bearer <token>`), 30-day expiry.
- The dedicated MySQL user above should have privileges scoped to only the
  `packsomework` database.
- Don't commit a real `.env` file — `.env.example` is the template; the real
  one (with your JWT secret, DB password, and SMTP credentials) should stay
  local to each machine you deploy to.
