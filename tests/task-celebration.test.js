const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordTaskCheckIn, celebrationLevel } = require('../src/lib/taskCelebration');

test('first check-in starts streak; same-day uploads do not multiply it', () => {
  const task = { done: false };
  recordTaskCheckIn(task, 'Asia/Kolkata', new Date('2026-09-22T04:00:00Z'));
  assert.equal(task.streakDays, 1);
  recordTaskCheckIn(task, 'Asia/Kolkata', new Date('2026-09-22T16:00:00Z'));
  assert.equal(task.streakDays, 1);
});
test('consecutive days build, gaps reset, timezone remains fixed', () => {
  const task = {};
  recordTaskCheckIn(task, 'Asia/Kolkata', new Date('2026-09-22T18:00:00Z'));
  recordTaskCheckIn(task, 'America/New_York', new Date('2026-09-22T19:00:00Z'));
  assert.equal(task.streakDays, 2);
  assert.equal(task.streakTimeZone, 'Asia/Kolkata');
  recordTaskCheckIn(task, 'UTC', new Date('2026-09-25T00:00:00Z'));
  assert.equal(task.streakDays, 1);
});
test('daylight saving changes count calendar days rather than 24-hour intervals', () => {
  const task = {};
  recordTaskCheckIn(task, 'America/New_York', new Date('2026-03-08T04:30:00Z'));
  recordTaskCheckIn(task, 'America/New_York', new Date('2026-03-09T03:30:00Z'));
  assert.equal(task.streakDays, 2);
});
test('completed tasks do not gain streaks and invalid zones fall back to UTC', () => {
  const task = { done: true, streakDays: 4 };
  assert.equal(recordTaskCheckIn(task, 'UTC'), null);
  assert.equal(task.streakDays, 4);
  const active = {};
  recordTaskCheckIn(active, 'not-a-zone');
  assert.equal(active.streakTimeZone, 'UTC');
});
test('effects escalate at 3, 7 and 14 days; completion receives milestone effects', () => {
  assert.deepEqual([1, 2, 3, 7, 14, 50].map(n => celebrationLevel(n, false, false)), [1, 1, 2, 3, 4, 4]);
  assert.equal(celebrationLevel(1, true, false), 3);
  assert.equal(celebrationLevel(1, true, true), 4);
});
