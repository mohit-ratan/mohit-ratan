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

## Shared award designs and 45-day gold award

Today and the public gallery share the duration medal component. All category medals use the prized gold palette, with leaf, dollar, and heart symbols for Health, Wealth, and Relationships. The Trifecta retains its larger interlocking-ring medallion and shares the original category crown. Targets under 10 days carry one star, 10–20 two, 21–30 three, and all targets above 30 four. Medallions display the actual goal task-day target. Side laurels and cast shadows are removed. Gallery medals are explicitly previews, not user unlocks.

The prized gold Trifecta requires recorded goal completion check-ins in all three categories within a rolling 45 × 24-hour window. It is granted once and persists under `trifecta-45`. Previous lifetime `trifecta` records remain in the database but do not qualify for the new award. No completion dates are fabricated for legacy goals. Today shows categories completed inside the current window, and the Achievement House uses the same gold design after earning it.

## Photo progress snapshots and notification links

- Startup creates `post_goal_progress` with a foreign key to posts. Task-linked photo uploads save their goal day totals in the same transaction as task progress. Existing photos without a snapshot keep the current goal baseline before the next check-in; exact historical counts are unavailable. Reading the feed also saves missing baselines. No schema reimport is needed.
- Mobile feed shows remaining monthly freeze days. Like and other post-linked activity notifications open the referenced post directly, even beyond the first feed page. Deleted or inaccessible posts show an unavailable message and retain normal access checks.
- Validation: `npm test` (38 passing, one opt-in MySQL suite skipped) and `npm --prefix client run build` passed locally. Production deployment and mobile acceptance remain to be verified.

## Per-goal weekly fire awards

- Startup adds `goal_streaks`. Each task-linked check-in updates this state inside the existing locked goal transaction. A goal counts one check-in per local calendar day across its tasks, using its first recorded timezone. Seven consecutive days earn a fire award, and further runs earn another every seven days.
- An isolated missed day resets this goal streak to zero, marks an unfinished attempt missed, and activates the next attempt. Earned weeks remain earned. These strict per-goal awards do not use the separate profile streak-freeze allowance. Reads show a missed attempt immediately after the grace day ends, without creating history on reads.
- Existing recorded task check-in dates seed the new goal history; older dates that were never recorded are not fabricated. Photo task-day snapshots remain unchanged. Fire indicators show the goal's current recorded streak status.
- Progress paths show fire markers and a final category goal award. Only a newly earned week or goal completion shows its corresponding award in the animated pop-up; feed reads do not trigger celebrations. A completed goal takes priority when both awards are earned together.

## Achievement gallery and full streak runs

- The profile achievements route now shows a category-filtered gallery of goal awards and flame-shaped streak awards. The house illustration, floor copy, and 3D entry are removed; existing `?floor=` links still select the right category.
- The achievements API exposes run awards only for goals with posts visible to the viewer, under the same profile access checks. Each run earns its first fire award at seven days; it displays the current length while active and retains its exact final length after a break (for example, 20 days). Weekly marker history is grouped into complete runs, including the final partial week. Subsequent runs do not replace previous awards.
- The Trifecta crown is larger, using the same restored category crown shape. Goal awards retain their actual task-day totals and four duration bands.

## Profile monthly highlights

- Profiles now show a monthly recap for completed calendar months, with positive factual highlights, goal completion records, active-day and check-in totals, the longest recorded run within the month, and up to six photos spread across that month. Each image links to its original post. Videos count as shared moments but are not rendered as image thumbnails.
- `GET /api/profile/:id/monthly-recaps` computes highlights on demand from current visible posts and recorded task check-ins. It automatically includes a month after it ends, with no scheduled publishing job or additional secrets. Six-month windows and a `before=YYYY-MM` cursor support earlier months. The owner's saved reminder timezone is used, defaulting to UTC.
- Existing profile/block access and per-post friends visibility apply before aggregation. Recaps never query journals or expired stories. Deleting a post or restricting its visibility removes it from the recap for affected viewers. Highlights are deterministic summaries of recorded activity, with no image-content claims or external AI calls. Historical goal completion dates that were not recorded are not fabricated.

## Monthly memory reels

- Recaps with photos offer an in-app vertical reel: an opening month card, the recap’s visible photos with factual highlight captions, and a closing milestone card. Playback supports pause, previous/next slides, replay, optional music, keyboard controls, and reduced-motion settings. Backgrounding the app pauses playback; closing the reel stops audio.
- Three original instrumental beds are bundled under `client/public/audio`, with upbeat Health, focused Wealth, and warm Relationships themes. The recap’s most-posted category selects the soundtrack. Sound is off until explicitly enabled. Audio failures leave the visual reel usable.
- `scripts/generate-reel-music.py` reproduces the bundled WAV files without external recordings or dependencies. Vite copies them into `public/audio` during the normal build. No music-provider keys or external media service is required.
- Reels use only the images already authorized for that viewer’s monthly recap. This is in-app playback, not a downloadable or externally published video. Real-device playback and audio checks remain part of deployment acceptance.

## Monthly recap inbox notifications

- Startup adds `monthly_recap_notifications`, keyed by user and recap month. A background check every 15 minutes creates one in-app notice for the most recently completed month when it contains posts. Member reminder timezones determine the boundary; UTC is the fallback. Startup and notification-inbox reads catch up after downtime. No email or device push is sent.
- The notice reads “PackSomeWork brings you your monthly recap” with its month and uses the brand icon. Selecting it opens the recipient’s profile, selects that exact month, and opens its reel when photos remain available. Music still requires explicit enabling.
- The unique user/month key prevents duplicates from concurrent workers or repeated polling. Mark-all-read includes these notices. Account deletion cascades them. No notifications are created for empty months, and prior-month photo visibility continues to be enforced when the recap is opened.

## Awards in monthly highlights

- Recaps include an earned-award gallery and reels give each award its own slide. Goal medals use the saved target on the completion post when available; unknown historical targets use a generic trophy rather than inventing a day count or star rank.
- Fire awards are reconstructed from visible recorded check-ins through that month’s end. Runs can span months and retain their full count as of month-end. They appear when a weekly milestone or completed run belongs to the selected month; previously completed runs are not repeated in later months.
- The persisted Trifecta is included in its actual earning month. For public viewers who cannot see friends-only posts, the recap requires visible qualifying goal completions in all three categories. Normal profile and post access checks continue to apply before any award aggregation.

## Profile streak display consistency

- Profile freezes protect an isolated missed yesterday before today's post is uploaded. The badge therefore does not first show zero and then revive an older streak after uploading. Freeze protection never creates days before the first real post or story, and two consecutive missed days still break the run.
- Already recorded freezes remain valid when their monthly allowance is exhausted; refreshing does not shorten the displayed streak. New freezes consume the allowance for the missed day's calendar month. Duplicate uploads within one day still count once.
