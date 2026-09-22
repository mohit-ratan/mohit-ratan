import { CATEGORIES } from './format';

// Static content for the public Awards Gallery (/awards) — describes what
// each award LOOKS like and how it's earned, but carries no per-user data.
// Real earned awards live in a member's own Achievement House; this is a
// catalog of designs, not a personal trophy list.
//
// Two kinds, one pair per category:
// - "goal" trophies mirror the real rule in postsController.achievements():
//   a goal's checklist must be non-empty and every subtask marked done.
// - "consistency" badges are themed to the streak/heatmap mechanic (posting
//   or sharing stories on consecutive days) rather than a category-specific
//   counter, since streaks are tracked app-wide today.
export const AWARD_COLLECTIONS = CATEGORIES.map((cat) => ({
  category: cat.id,
  label: cat.label,
  emoji: cat.emoji,
  awards: [
    {
      id: `${cat.id}-goal`,
      kind: 'goal',
      icon: '🏆',
      name: `${cat.label} Goal Trophy`,
      rule: `Set a goal tagged to ${cat.label}, break it into tasks, and check off every single one. The moment the last task is done, this trophy is added to your Achievement House.`,
    },
    {
      id: `${cat.id}-consistency`,
      kind: 'consistency',
      icon: '🔥',
      name: `${cat.label} Consistency Badge`,
      rule: `Keep your daily streak going with photos or stories, especially in ${cat.label.toLowerCase()}. The longer the streak, the brighter this badge glows on your consistency heatmap.`,
    },
  ],
}));

export const AWARD_KIND_COPY = {
  goal: {
    label: 'Goal trophy',
    blurb: 'Awarded once, the moment every task in a goal is complete — a permanent record of one finished goal.',
  },
  consistency: {
    label: 'Consistency badge',
    blurb: "Reflects your ongoing streak, not a single finish line — it stays lit as long as you keep showing up.",
  },
};
