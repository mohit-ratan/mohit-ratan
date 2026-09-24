const { normalizeTasks } = require('./goalProgress');
const { calendarDay, validTimeZone } = require('./taskCelebration');
const categories = ['health','wealth','relationships'];
const shiftDay = (day, delta) => new Date(Date.parse(`${day}T12:00:00Z`) + delta*86400000).toISOString().slice(0,10);
function longestStreak(days) {
  let best=0, run=0, previous;
  for (const day of [...new Set(days)].sort()) { run = previous && shiftDay(previous,1) === day ? run+1 : 1; best=Math.max(best,run); previous=day; }
  return best;
}
function summarize(goals, events, consistency, timeZone, now = new Date()) {
  timeZone=validTimeZone(timeZone);
  const today=calendarDay(now,timeZone), from=shiftDay(today,-6);
  const mapped = goals.map(goal => ({ ...goal, subtasks:normalizeTasks(goal.subtasks), category:goal.category || 'health' }));
  const tasks=mapped.flatMap(goal=>goal.subtasks.map((task,index)=>({ ...task, index, tag:goal.tag, category:goal.category, targetDate:goal.target_date ? String(goal.target_date).slice(0,10) : null,
    daysLeft:goal.target_date ? Math.round((Date.parse(`${String(goal.target_date).slice(0,10)}T12:00:00Z`)-Date.parse(`${today}T12:00:00Z`))/86400000) : null,
    checkedInToday:task.lastProgressDate === calendarDay(now,validTimeZone(task.streakTimeZone || timeZone))
  }))).filter(task=>!task.done).sort((a,b)=>Number(a.checkedInToday)-Number(b.checkedInToday) || (a.daysLeft??Infinity)-(b.daysLeft??Infinity));
  const week=events.map(e=>({...e,localDay:calendarDay(new Date(Number(e.occurred_ms)),timeZone)})).filter(e=>e.localDay>=from&&e.localDay<=today);
  const awards=categories.map(category=>{
    const eligible=mapped.filter(g=>g.category===category&&g.subtasks.length);
    const completed=eligible.filter(g=>g.subtasks.every(t=>t.done)).length;
    const ratios=eligible.map(g=>({tag:g.tag,percent:Math.round(g.subtasks.reduce((n,t)=>n+t.completedDays,0)/g.subtasks.reduce((n,t)=>n+t.targetDays,0)*100)}));
    const nearest=ratios.sort((a,b)=>b.percent-a.percent)[0];
    const earnedStreak=consistency.find(c=>c.category===category);
    return {category,taskAwards:eligible.flatMap(g=>g.subtasks.map(t=>({id:`${g.tag}:${t.id}`,tag:g.tag,text:t.text,targetDays:t.targetDays,completedDays:t.completedDays}))),completedGoals:completed,goalPercent:nearest?.percent||0,nearestGoal:nearest?.tag||null,bestStreak:earnedStreak?.best_streak||0,consistencyEarned:!!earnedStreak?.earned_at};
  });
  return {today,timeZone,tasks,awards,recap:{from,to:today,checkIns:week.length,goalsCompleted:new Set(week.filter(e=>e.goal_completed).map(e=>e.goal_tag)).size,bestStreak:longestStreak(week.map(e=>e.localDay)),categories:categories.map(category=>({category,checkIns:week.filter(e=>e.category===category).length})),days:Array.from({length:7},(_,i)=>{const day=shiftDay(from,i);return {day,count:week.filter(e=>e.localDay===day).length};})}};
}
module.exports={summarize,longestStreak,shiftDay};
