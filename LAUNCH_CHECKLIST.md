# Launch readiness tracker

Last updated: 22 September 2026.

This checklist records review findings and verification work. Unchecked items
remain open; an implementation alone does not confirm production behavior.

## Confirmed

- [x] Public introduction deployed; landing-page copy verified in the live bundle.
- [x] OTP email delivery works in the user's test (confirmed 22 September 2026).
  Delivery across other recipients and providers has not been verified.

## P0 — Privacy and account protection

- [x] Enforce privacy and blocking checks when reading another user's goal details.
- [x] Check post visibility before reading comments, adding comments, or liking posts.
- [x] Test access as owner, accepted follower, unrelated user, and blocked user.
- [x] Generate OTPs with cryptographically secure randomness.
- [x] Limit OTP verification attempts and throttle OTP requests and password logins.
- [x] Verify expired, reused, and concurrent OTP submissions cannot bypass controls.
- [ ] Confirm the production JWT secret is strong and the earlier warning is resolved.
  Never record the secret in this file.

## P1 — Account recovery and feedback

- [x] Implement password reset with expiring, single-use links.
- [x] Add verification-email resend for existing unverified accounts.
- [x] Correct registration feedback when sending fails.
- [x] Replace expired-link instructions to register again with a recovery action.

## P2 — Usability and public introduction

- [x] Fix feed retry so a click event is not passed as the pagination offset.
- [x] Show errors and a retry action when loading more posts fails.
- [x] Add first-goal onboarding for category, task, and duration.
- [x] Add search-description and social-sharing metadata.
- [x] Provide account deletion, privacy information, and contact/reporting controls.

## Production verification

- [ ] Test signup, verification, OTP login, and recovery with multiple recipient providers.
- [ ] Test photo uploads, keyboard overlap, and navigation on actual mobile devices.
- [ ] Verify a task-linked photo increments progress correctly and completing all tasks earns an award.
- [ ] Verify private content remains inaccessible through direct API requests.
- [ ] Verify uploaded media survives redeployment.
- [ ] Verify database backups can be restored and document the rollback process.

## Validation completed locally

- `npm test`: 19 passing unit/controller tests (MySQL integration is opt-in).
- `PSW_TEST_MYSQL=1 node --test tests/security.integration.test.js`: 6 passing
  scenarios plus the parent test, using a newly created and removed local database.
  Covers the owner/follower/stranger/blocked access matrix, concurrent and expired
  OTP/reset use, rate budgets, session revocation, registration feedback, reporting,
  and account deletion with foreign-key cascades.
- `npm run build`: passed; existing optional 3D chunk-size warning remains.
- Above checked implementation items are local, not a claim of production deployment.

## Additional finding

- [ ] Migrate media delivery away from public R2 URLs before promising private files.
  Application/API access checks now apply, but an existing direct file URL remains
  public. The privacy page documents this current limitation.

## Next action

Review production secrets and proxy configuration, back up the database, deploy,
then perform the remaining production/device checks using [OPERATIONS.md](docs/OPERATIONS.md).
The app now refuses to start in production with a missing/placeholder JWT secret
or a non-HTTPS APP_URL. Do not deploy without checking these settings first.
