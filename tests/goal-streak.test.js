const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkInGoal, currentGoalStreak, goalStreakFromDays } = require('../src/lib/goalStreak');
const at = day => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`);

test('seven distinct goal days earn a fire award, same-day uploads count once', () => {
  let state;
  for (let day = 1; day <= 14; day++) {
    const result = checkInGoal(state, 'UTC', at(day));
    state = result.state;
    assert.equal(!!result.award, day === 7 || day === 14);
    const duplicate = checkInGoal(state, 'UTC', at(day));
    assert.equal(duplicate.award, null);
    assert.equal(duplicate.state.streakDays, day);
  }
  assert.deepEqual(state.attempts.map(a => a.status), ['earned', 'earned']);
});
test('a missed day greys an incomplete attempt and restarts the next at one', () => {
  let state = checkInGoal(null, 'UTC', at(1)).state;
  state = checkInGoal(state, 'UTC', at(2)).state;
  const expired = currentGoalStreak(state, at(4));
  assert.equal(expired.streakDays, 0);
  assert.equal(expired.attempts[0].status, 'missed');
  assert.equal(state.attempts[0].status, 'active'); // Reads do not rewrite history.
  const restarted = checkInGoal(state, 'UTC', at(4));
  assert.equal(restarted.state.streakDays, 1);
  assert.deepEqual(restarted.state.attempts.map(a => a.status), ['missed', 'active']);
  assert.equal(restarted.state.attempts[1].days, 1);
});
test('an earned week stays earned after a later missed day and goals are independent', () => {
  let first;
  for (let day = 1; day <= 8; day++) first = checkInGoal(first, 'UTC', at(day)).state;
  const second = checkInGoal(null, 'UTC', at(8)).state;
  const expired = currentGoalStreak(first, at(10));
  assert.deepEqual(expired.attempts.map(a => a.status), ['earned', 'missed']);
  assert.equal(second.streakDays, 1);
  assert.equal(first.streakDays, 8);
});
test('history rebuild deduplicates days and uses recorded activity, not upload totals', () => {
  const state = goalStreakFromDays(['2026-10-03', '2026-10-01', '2026-10-01', '2026-10-02'], 'Asia/Kolkata');
  assert.equal(state.streakDays, 3);
  assert.equal(state.lastDay, '2026-10-03');
  assert.equal(state.timeZone, 'Asia/Kolkata');
});
test('goal timezone remains fixed and grace lasts until the next local day ends', () => {
  const first = checkInGoal(null, 'Asia/Kolkata', new Date('2026-10-01T18:00:00Z')).state;
  const next = checkInGoal(first, 'America/New_York', new Date('2026-10-01T19:00:00Z')).state;
  assert.equal(next.streakDays, 2);
  assert.equal(next.timeZone, 'Asia/Kolkata');
  assert.equal(currentGoalStreak(next, new Date('2026-10-03T18:29:59Z')).streakDays, 2);
  assert.equal(currentGoalStreak(next, new Date('2026-10-03T18:30:00Z')).streakDays, 0);
});
