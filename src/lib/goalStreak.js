const { calendarDay, validTimeZone } = require('./taskCelebration');

function parseState(raw) {
  if (typeof raw === 'string') raw = JSON.parse(raw);
  return raw ? JSON.parse(JSON.stringify(raw)) : { streakDays: 0, attempts: [] };
}
function dayGap(earlier, later) {
  return (Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86400000;
}
// Reads can show an expired attempt immediately, without creating new history.
function currentGoalStreak(raw, now = new Date()) {
  const state = parseState(raw);
  state.attempts ||= [];
  if (state.lastDay && dayGap(state.lastDay, calendarDay(now, validTimeZone(state.timeZone))) > 1) {
    const active = state.attempts.at(-1);
    if (active?.status === 'active') active.status = 'missed';
    state.streakDays = 0;
  }
  return state;
}
function checkInGoal(raw, requestedZone, now = new Date()) {
  const state = currentGoalStreak(raw, now);
  state.timeZone = validTimeZone(state.timeZone || requestedZone);
  const today = calendarDay(now, state.timeZone);
  if (state.lastDay === today) return { state, award: null };
  let attempt = state.attempts.at(-1);
  if (!attempt || attempt.status !== 'active') {
    attempt = { status: 'active', days: 0, startedOn: today };
    state.attempts.push(attempt);
  }
  attempt.days += 1;
  state.streakDays += 1;
  state.lastDay = today;
  const award = attempt.days === 7 ? { days: 7, totalStreakDays: state.streakDays, number: state.attempts.filter(a => a.status === 'earned').length + 1 } : null;
  if (award) { attempt.status = 'earned'; attempt.earnedOn = today; }
  return { state, award };
}
function goalStreakFromDays(days, requestedZone) {
  let state;
  for (const day of [...new Set(days)].sort()) {
    state = checkInGoal(state, 'UTC', new Date(`${day}T12:00:00Z`)).state;
  }
  if (state) state.timeZone = validTimeZone(requestedZone);
  return state || parseState(null);
}
// Weekly attempts are grouped into full runs so a broken 20-day streak
// keeps an exact 20-day award, rather than losing its last six days.
function goalStreakAwards(raw, now = new Date()) {
  const state = currentGoalStreak(raw, now);
  const runs = [];
  for (const attempt of state.attempts) {
    if (!attempt.days || !attempt.startedOn) continue;
    const endedOn = new Date(Date.parse(`${attempt.startedOn}T00:00:00Z`) + (attempt.days - 1) * 86400000).toISOString().slice(0, 10);
    const previous = runs.at(-1);
    if (previous && dayGap(previous.endedOn, attempt.startedOn) === 1) {
      previous.days += attempt.days;
      previous.endedOn = endedOn;
    } else runs.push({ startedOn: attempt.startedOn, endedOn, days: attempt.days });
  }
  return runs.filter(run => run.days >= 7).map(run => ({
    ...run, id: run.startedOn,
    active: state.streakDays > 0 && run.endedOn === state.lastDay,
  }));
}
module.exports = { goalStreakAwards, goalStreakFromDays, currentGoalStreak, checkInGoal };
