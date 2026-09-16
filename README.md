# PackSomeWork — full-stack app

A social feed for health, wealth, and relationships — photos and videos only, with
an on-device "AI look" photo styler, 24-hour stories, streaks, and real email/OTP
authentication.

This is a single Node.js app (Express API + a pre-built React frontend served
as static files), structured to drop straight onto GoDaddy's Node.js hosting
or any similar host that just runs `npm install` + `npm start`:

```
├── node_modules/         # not uploaded — installed automatically by the host
├── public/               # built frontend (index.html, JS/CSS) + persistent uploads
│   └── assets/
│       └── uploads/      # user-uploaded photos/videos, served at /assets/uploads/...
├── client/               # React 19 + Vite source — builds into ../public
├── src/                  # Express API source
│   ├── controllers/      # request handlers (DB queries, business logic)
│   ├── routes/           # thin route definitions wired to controllers
│   ├── middleware/
│   ├── utils/
│   ├── db.js
│   ├── upload.js
│   └── index.js          # main application entry point
├── schema.sql            # MySQL schema
├── package.json          # includes the "start" script the host runs
└── .gitignore            # excludes node_modules, .env, uploaded media, etc.
```

- **client/** — React 19 + Vite. `npm run build` compiles it straight into
  `public/`, so the deployed app is just one Express process.
- **src/** — Node.js + Express REST API. Handles auth, posts, stories,
  profiles, file uploads, and serves the built frontend + uploaded media.
- **MySQL** — stores everything (see `schema.sql`).

Nothing here is deployed anywhere — it's yours to host wherever you like
(GoDaddy's Node.js hosting, a VPS, Render/Railway/Fly.io, etc.), then point
packsomework.com's DNS at it.

## 1. Set up MySQL

Create a database and load the schema:

```bash
mysql -u root -p -e "CREATE DATABASE packsomework CHARACTER SET utf8mb4;"
mysql -u root -p packsomework < schema.sql
```

It's best practice not to run the app as the MySQL `root` user. Create a
dedicated user instead:

```sql
CREATE USER 'packsomework'@'localhost' IDENTIFIED BY 'choose-a-real-password';
GRANT ALL PRIVILEGES ON packsomework.* TO 'packsomework'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Configure the app

```bash
npm install
cp .env.example .env
```

Edit `.env`:

- `JWT_SECRET` — generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `DB_USER` / `DB_PASSWORD` / `DB_NAME` — match what you created above
- `APP_URL` — the public URL this app itself will be reachable at (used to
  build the email-verification link), e.g. `https://packsomework.com` in
  production
- `SMTP_*` — real credentials for sending verification emails and OTP codes.
  Any standard SMTP provider works: your GoDaddy email hosting, Gmail (with an
  App Password), SendGrid, Mailgun, Resend, Postmark, etc. **Without these set,
  the server logs the email content to its console instead of sending it** —
  fine for local testing, but real users need real email delivery.

## 3. Build the frontend

```bash
npm run build
```

This installs the frontend's own dependencies (React, Vite) under `client/`
and compiles it into `public/` — the folder the Express app serves as
static files. Run this again any time you change something in `client/`.
`public/assets/uploads/` (user-uploaded media) is never touched by a rebuild.

For local frontend development with hot reload instead, run the Vite dev
server directly against a separately-running API:

```bash
cd client
npm install
cp .env.example .env.local   # set VITE_API_URL=http://localhost:4000
npm run dev
```

## 4. Run the app

```bash
npm run dev      # auto-restarts on changes (nodemon)
# or
npm start
```

The app listens on `http://localhost:4000` by default — `GET /api/health`
should return `{"ok":true}`, and every other route serves the built React
app. Uploaded photos/videos are written to `public/assets/uploads/` and
served at `/assets/uploads/...`.

Open `http://localhost:4000`, register an account, verify the email (or read
the verification link from the console log if SMTP isn't configured yet),
and sign in.

## Deploying to GoDaddy (or similar Node hosting)

Upload everything except `node_modules/` (the host installs dependencies
from `package.json` automatically). Make sure `public/` already contains a
build (run `npm run build` locally first and commit/upload its output — most
simple Node hosts don't run a build step for you). Set your `.env` values
(or the host's equivalent environment variable settings) and point the
host's start command at `npm start`.

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
- **Streaks**: consecutive-day posting/story streak with a one-day grace
  period, computed server-side.
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
