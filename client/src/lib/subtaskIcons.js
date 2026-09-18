// Best-effort keyword match from a subtask's free text to a representative
// emoji — reliable icon matching from arbitrary text isn't possible, so
// this covers common goal-related words across health/wealth/relationships
// and falls back to a generic star for anything unmatched.
const ICON_RULES = [
  [/guitar|piano|music|instrument/, '🎸'],
  [/gym|workout|dumbbell|weight|exercise|fitness|strength/, '🏋️'],
  [/run|running|jog|marathon/, '🏃'],
  [/walk|hike|steps/, '🚶'],
  [/yoga|meditat|mindful|breath/, '🧘'],
  [/sleep|rest/, '😴'],
  [/water|hydrat/, '💧'],
  [/book|read/, '📚'],
  [/course|certif|exam|study|class|degree/, '🎓'],
  [/code|coding|program|develop|app|architect/, '💻'],
  [/money|save|budget|invest|finance|salary|income/, '💰'],
  [/gift|present/, '🎁'],
  [/call|talk|chat|message/, '📞'],
  [/cook|meal|recipe|eat|diet|nutrition/, '🍳'],
  [/write|journal|blog/, '✍️'],
  [/travel|trip|flight|vacation/, '✈️'],
  [/clean|declutter|organize|tidy/, '🧹'],
  [/family|friend|relationship|love|date/, '❤️'],
];

export function iconForSubtask(text) {
  const t = (text || '').toLowerCase();
  for (const [re, icon] of ICON_RULES) {
    if (re.test(t)) return icon;
  }
  return '⭐';
}
