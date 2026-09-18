export const CATEGORIES = [
  { id: 'health', label: 'Health', emoji: '🌿' },
  { id: 'wealth', label: 'Wealth', emoji: '💰' },
  { id: 'relationships', label: 'Relationships', emoji: '❤️' },
];

export const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const AVATAR_COLORS = ['#C7470C', '#B94312', '#A93808', '#C24D16', '#AC3F0E', '#B64B1A'];

export function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  let s = parts[0] ? parts[0][0] : '';
  if (parts.length > 1) s += parts[parts.length - 1][0];
  return s.toUpperCase();
}

export function colorFor(id) {
  const str = id || 'x';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function truncate(s, n) {
  s = s || '';
  return s.length > n ? s.slice(0, n - 1).trim() + '…' : s;
}

export function postWord(p) {
  if (p.tag) return `#${p.tag}`;
  return '';
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const dt = new Date(ts);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function goalStatusLabel(goal, now = new Date()) {
  if (!goal) return null;
  if (goal.completed) return { text: '✅ Completed', tone: 'done' };
  if (!goal.targetDate) return null;
  // Compare local calendar dates, not elapsed hours (including DST changes).
  const [year, month, day] = goal.targetDate.split('-').map(Number);
  const deadline = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(deadline)) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((deadline - today) / 86400000);
  if (days < 0) return { text: `${-days} ${days === -1 ? 'day' : 'days'} overdue`, tone: 'overdue' };
  if (days === 0) return { text: 'Due today', tone: 'soon' };
  return { text: `${days} ${days === 1 ? 'day' : 'days'} left`, tone: 'active' };
}

// Aggregate goal status across a set of achievements — used on the house
// entry (all categories) and each hallway door (one category).
export function goalStats(achievements) {
  let trophies = 0;
  let active = 0;
  for (const a of achievements) {
    if (a.goal?.completed) trophies += 1;
    else if (a.goal) active += 1;
  }
  return { total: achievements.length, trophies, active };
}

export function parseTag(raw) {
  if (!raw) return '';
  return raw.replace(/^#/, '').toLowerCase().trim().split(/[,\s]+/)[0] || '';
}

export function taskProgress(task) {
  const target = Math.max(1, Number(task.targetDays) || 1);
  const completed = Math.min(target, Math.max(0, Number(task.completedDays ?? (task.done ? target : 0)) || 0));
  return { target, completed };
}

export function tasksProgress(tasks) {
  return tasks.reduce((total, task) => {
    const progress = taskProgress(task);
    return { target: total.target + progress.target, completed: total.completed + progress.completed };
  }, { target: 0, completed: 0 });
}
