// Dates come from server time. The task's timezone is fixed on its first check-in.
function validTimeZone(value) {
  if (typeof value !== 'string' || value.length > 80) return 'UTC';
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return value; }
  catch { return 'UTC'; }
}
function calendarDay(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function recordTaskCheckIn(task, requestedZone, now = new Date()) {
  if (task.done) return null;
  const timeZone = validTimeZone(task.streakTimeZone || requestedZone);
  const today = calendarDay(now, timeZone);
  const prior = task.lastProgressDate;
  const gap = prior ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${prior}T00:00:00Z`)) / 86400000) : NaN;
  const previous = Number.isInteger(task.streakDays) && task.streakDays > 0 ? task.streakDays : 0;
  const streak = gap === 0 ? Math.max(1, previous) : gap === 1 ? previous + 1 : 1;
  task.streakTimeZone = timeZone;
  task.lastProgressDate = today;
  task.streakDays = streak;
  return { streakDays: streak, streakTimeZone: timeZone };
}
function celebrationLevel(streakDays, taskCompleted, goalCompleted) {
  const streakLevel = streakDays >= 14 ? 4 : streakDays >= 7 ? 3 : streakDays >= 3 ? 2 : 1;
  return Math.max(streakLevel, goalCompleted ? 4 : taskCompleted ? 3 : 1);
}
module.exports = { recordTaskCheckIn, celebrationLevel, calendarDay, validTimeZone };
