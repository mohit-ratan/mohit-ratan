# Deployment and recovery

## Before this release

- Back up the database and retain the currently deployed commit ID before deployment.
- Set `APP_URL` to the HTTPS public origin and `JWT_SECRET` to a private random value
  of at least 32 characters in hosting Secrets. Production now refuses to start
  with missing/placeholder settings. Changing the JWT secret signs everyone out.
- Keep the working email configuration. No real emails are sent by the test suite.
- If behind a proxy, confirm the exact trusted proxy count before setting
  `TRUST_PROXY_HOPS`. Do not blindly set it to 1 or trust all forwarded headers.
  Without it, the IP limit may be shared by people behind the hosting proxy.
- Startup creates four additive tables: auth_security, auth_rate_limits,
  support_reports, media_deletion_queue. It does not reimport schema.sql or delete
  existing user data. Database user needs CREATE TABLE privileges.
- Existing pending OTPs must be requested again after this release. New OTPs are
  HMAC-protected, expire after 10 minutes, and lock after five incorrect attempts.
- Request limits are persisted in MySQL. OTP requests: 3 per identity per 10 minutes;
  password login: 10 per identity per 15 minutes. IP limits are five times those.

## Reports and account deletion

- Review `support_reports` daily in the hosting database browser. `status` starts
  as `open`; update to `resolved` after handling it. Join `users` on `user_id` for
  the sender's email if a response is needed. Responses are manual.
- Deletion requires current password and the literal confirmation DELETE.
  Foreign keys cascade account content deletion. Sessions check account existence
  on every authenticated request. R2 media deletion is queued transactionally and
  retried at startup and every 15 minutes. Monitor `media_deletion_queue` for failures.
- Legacy non-R2 files require manual removal from the old hosting storage; the R2
  deletion helper does not delete those. Copies downloaded by others cannot be recalled.
- R2 currently uses public URLs. API privacy tests do NOT make direct file URLs
  private. Before offering confidential media, migrate to a private bucket with
  authenticated/signed delivery, then disable public access and purge cached URLs.
  Do not disable the public bucket before changing delivery: that breaks all media.

## Backup and restore drill (operator action)

1. Export the live database through the hosting backup/export feature, store it
   outside the repository in encrypted restricted storage, and record its timestamp.
2. Provision a SEPARATE empty staging database. Do not use production as a restore target.
3. Import the backup into staging and compare table counts and sample goals/posts.
4. Start a staging app against that database with a separate JWT secret. Disable
   scheduled reminders and outbound email during the drill; never email restored users.
5. Verify representative media references, account access, and task progress.
6. Record date, operator, backup ID, restore duration, and result. Remove the staging
   copy securely once testing finishes.

The GoDaddy import workflow may replace tables: never upload schema.sql to the live
import tool as a migration. The release only adds tables at startup.

## Rollback

- Republish the recorded previous application commit if the release fails. Do not
  drop the new tables. Preserve a fresh backup before any database repair.
- If rolling back session-version enforcement, rotate JWT_SECRET so reset/deleted
  sessions cannot regain access through an older authentication implementation.
- If the startup secret/origin guard fails, correct hosting Secrets before restarting.
  Do not remove the guard to get the deployment green.

## Production acceptance (not performed automatically)

- Use dedicated test accounts; test signup, verification resend, reset, OTP, expiry,
  cooldown, logout, and old-session rejection after reset.
- Repeat email delivery with at least two recipient providers. Inspect provider
  delivery/bounce results; acceptance alone is not inbox delivery.
- Test on iOS Safari and Android Chrome: keyboards, uploads, rotation, slow network,
  modal dismissal, first-goal guide, and account controls.
- Upload a test photo, record its URL, redeploy, and verify both image and task progress.
- Complete all task days and confirm exactly one goal achievement; ordinary posts
  must not count as achievements. Multiple task-linked uploads on one day each count,
  matching the existing product rule.
- Verify denied access via direct goal/comment/like API requests using unrelated and
  blocked test accounts, not just by hiding buttons.
- Record evidence in LAUNCH_CHECKLIST.md. Never mark unperformed checks complete.

## Automated local checks

- `npm test`: unit and controller fixtures; integration suite is skipped by default.
- `PSW_TEST_MYSQL=1 node --test tests/security.integration.test.js`: opt-in local
  MySQL tests using root through `/tmp/mysql.sock`. Creates a uniquely named scratch
  database and removes it afterwards; never loads .env. Covers real transactions,
  parallel OTP/reset consumption, limits, privacy, session revocation, and deletion.
- `npm run build`: production frontend compilation.

## Daily progress and private journal rollout

- `/today`: owner-only tasks, rolling seven-day recap, opt-in email reminder settings, and award progress. `/journal`: owner-only reflections. The public awards gallery remains `/awards`.
- New tables are created on startup. Task-photo check-ins are recorded atomically with task progress. Historical upload timestamps are not backfilled. Weekly goal completions count distinct goal tags. A category consistency badge is permanently earned by a seven-calendar-day streak on the same task; multiple same-day photos increase task progress but not streak length.
- Personal task reminders default OFF. Users choose time and IANA timezone. The job checks every five minutes and claims at most one email per user/local day, including across multiple workers. Failed or uncertain sends are not retried automatically that day. `DISABLE_REMINDERS=true` disables this job. Existing accountability-partner reminders are separate.
- To enable journal text, set `JOURNAL_ENCRYPTION_KEY` in production Secrets to a securely generated 32-byte random value encoded as 64 hex characters. Back up this key securely. Do not reuse JWT_SECRET or rotate the journal key without migrating existing encrypted entries.
- To enable private journal photos, create a separate R2 bucket, disable both its public development URL and custom domains, give the existing R2 credentials access, and set `R2_PRIVATE_BUCKET` to its name. It must differ from the public media bucket. Notes and photo copies use authenticated AES-256-GCM encryption; the server decrypts only after owner authentication. This is server-side encryption, not end-to-end encryption. Photo responses are no-store and use authenticated blob fetching, never public URLs.
- Existing feed photos retain their existing visibility/storage behavior. A private journal copy does not remove an already shared feed photo. The journal remains unavailable until its key is configured; photo attachment remains unavailable until its private bucket is configured.
- Deleting a journal entry queues its photo for the existing media cleanup job; deleting an account also queues all its journal photos. Keep bucket credentials available until cleanup is finished.
- After hosting deployment, verify `/today`, opt into a reminder with a test account, and confirm actual email delivery. Verify journal text/photo save and delete with two accounts and confirm the other account cannot access the private photo endpoint. These live provider checks are not performed by the local test suite.

## Upload folders

New uploads use UTC upload dates in their object keys: `posts/YYYY/MM/DD/<uuid>.<ext>`, `stories/YYYY/MM/DD/<uuid>.<ext>`, and `avatars/YYYY/MM/DD/<uuid>.<ext>`. Private encrypted journal photos use `journal/YYYY/MM/DD/<uuid>.bin` in the separate private bucket. No additional environment settings or manual folder creation are needed. Existing objects stay at their original paths; stored URLs and deletion references continue to work.
