const { awardsForMonth } = require('./monthlyAwards');
const { calendarDay, validTimeZone } = require('./taskCelebration');
const { longestStreak } = require('./memberSummary');

function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year, number - 1 + delta, 1)).toISOString().slice(0, 7);
}
function recapWindow(timeZone, before, now = new Date()) {
  const current = calendarDay(now, validTimeZone(timeZone)).slice(0, 7);
  const latest = before && before < current ? shiftMonth(before, -1) : shiftMonth(current, -1);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(latest, -i));
  // A small UTC buffer covers all local timezone offsets; grouping below
  // applies the precise local calendar month, including daylight-saving time.
  const from = new Date(Date.parse(`${months.at(-1)}-01T00:00:00Z`) - 86400000);
  const to = new Date(Date.parse(`${shiftMonth(latest, 1)}-01T00:00:00Z`) + 86400000);
  return { months, from, to, nextBefore: months.at(-1) };
}
function summarizeMonths(rows, months, timeZone, options = {}) {
  timeZone = validTimeZone(timeZone);
  const eligible = rows.map(row => ({ ...row, localDay: calendarDay(new Date(row.created_at), timeZone) }));
  return months.flatMap(month => {
    const posts = eligible.filter(row => row.localDay.slice(0, 7) === month);
    if (!posts.length) return [];
    const checkIns = posts.filter(row => row.day_key);
    const goalTags = [...new Set(posts.filter(row => Number(row.first_goal_completion)).map(row => row.tag))];
    const byGoal = new Map();
    for (const post of checkIns) {
      if (!byGoal.has(post.tag)) byGoal.set(post.tag, []);
      byGoal.get(post.tag).push(post.day_key);
    }
    const awards = awardsForMonth(posts, options.history || eligible.filter(row => row.day_key), options.specialAwards || [], month, timeZone, options.revealAllAwards);
    const bestStreak = Math.max(0, ...[...byGoal.values()].map(longestStreak));
    const activeDays = new Set(posts.map(row => row.localDay)).size;
    const categories = ['health', 'wealth', 'relationships'].map(category => ({ category, posts: posts.filter(row => row.category === category).length })).filter(item => item.posts);
    const highlights = [`You showed up on ${activeDays} ${activeDays === 1 ? 'day' : 'days'} and shared ${posts.length} ${posts.length === 1 ? 'moment' : 'moments'} worth remembering.`];
    if (goalTags.length) highlights.push(`You finished ${goalTags.length} ${goalTags.length === 1 ? 'goal' : 'goals'}: ${goalTags.map(tag => `#${tag}`).join(', ')}.`);
    if (awards.length) highlights.push(`You earned ${awards.length} ${awards.length === 1 ? 'award' : 'awards'} to celebrate your progress.`);
    if (checkIns.length) highlights.push(`You added ${checkIns.length} photo ${checkIns.length === 1 ? 'check-in' : 'check-ins'} toward your goals${bestStreak >= 2 ? `, including a ${bestStreak}-day run within this month` : ''}.`);
    const names = { health: 'Health', wealth: 'Wealth', relationships: 'Relationships' };
    highlights.push(`You made time for ${categories.map(item => names[item.category]).join(', ')}. Keep building on the work you shared.`);
    // Spread photo choices across the month instead of taking only its last day.
    const photos = posts.filter(row => row.media_type === 'image').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const images = photos.length <= 6 ? photos : Array.from({ length: 6 }, (_, i) => photos[Math.round(i * (photos.length - 1) / 5)]);
    return [{ month, label: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`)),
      awards, awardCount: awards.length, postCount: posts.length, activeDays, checkIns: checkIns.length, goalsCompleted: goalTags.length, bestStreak, categories, highlights,
      images: images.map(row => ({ id: row.id, mediaUrl: row.media_url, category: row.category, cropX: row.crop_x == null ? 50 : Number(row.crop_x), cropY: row.crop_y == null ? 50 : Number(row.crop_y) })),
    }];
  });
}
module.exports = { recapWindow, summarizeMonths };
