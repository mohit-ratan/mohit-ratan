const { calendarDay, validTimeZone } = require('./taskCelebration');
const { shiftDay } = require('./memberSummary');

function awardsForMonth(posts, history, specialAwards, month, timeZone, revealAllAwards = false) {
  timeZone = validTimeZone(timeZone);
  const goals = new Map();
  for (const post of posts.filter(row => Number(row.first_goal_completion))) {
    goals.set(post.tag, { id: `goal:${post.tag}`, kind: 'goal', tag: post.tag, category: post.category, targetDays: Number(post.goal_target) > 0 ? Number(post.goal_target) : null });
  }
  const awards = [...goals.values()];
  const [year, number] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, number, 1));
  const byGoal = new Map();
  for (const event of history) {
    const timestamp = Number(event.occurred_ms) || new Date(event.created_at).getTime();
    if (!event.day_key || !Number.isFinite(timestamp) || calendarDay(new Date(timestamp), timeZone).slice(0, 7) > month) continue;
    if (!byGoal.has(event.tag)) byGoal.set(event.tag, []);
    byGoal.get(event.tag).push({ ...event, localMonth: calendarDay(new Date(timestamp), timeZone).slice(0, 7) });
  }
  for (const [tag, events] of byGoal) {
    const runs = [];
    for (const day of [...new Set(events.map(event => event.day_key))].sort()) {
      const previous = runs.at(-1);
      if (previous && shiftDay(previous.endedOn, 1) === day) { previous.days++; previous.endedOn = day; }
      else runs.push({ id: day, startedOn: day, endedOn: day, days: 1 });
    }
    for (const run of runs.filter(item => item.days >= 7)) {
      run.active = run === runs.at(-1) && nextMonth.getTime() - Date.parse(`${run.endedOn}T00:00:00Z`) <= 86400000;
      let earnedThisMonth = false;
      for (let day = 7; day <= run.days; day += 7) {
        const earnedOn = new Date(Date.parse(`${run.startedOn}T00:00:00Z`) + (day - 1) * 86400000).toISOString().slice(0, 10);
        if (events.some(event => event.day_key === earnedOn && event.localMonth === month)) earnedThisMonth = true;
      }
      if (!run.active && events.some(event => event.day_key === run.endedOn && event.localMonth === month)) earnedThisMonth = true;
      if (earnedThisMonth) awards.push({ id: `streak:${tag}:${run.id}`, kind: 'streak', tag, category: events.find(event => event.day_key === run.endedOn)?.category || events[0].category, days: run.days });
    }
  }
  for (const special of specialAwards) {
    const earned = new Date(special.earned_at);
    if (!Number.isFinite(earned.getTime()) || calendarDay(earned, timeZone).slice(0, 7) !== month) continue;
    const visibleCategories = new Set(history.filter(event => Number(event.goal_completed) && Number(event.occurred_ms) <= earned.getTime() && Number(event.occurred_ms) >= earned.getTime() - 45 * 86400000).map(event => event.category));
    if (revealAllAwards || ['health', 'wealth', 'relationships'].every(category => visibleCategories.has(category))) {
      awards.push({ id: 'trifecta-45', kind: 'trifecta' });
    }
  }
  return awards;
}
module.exports = { awardsForMonth };
