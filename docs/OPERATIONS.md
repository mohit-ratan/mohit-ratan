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
