import { CATEGORIES } from './format';

// Static content for the public Awards Gallery (/awards) — describes what
// each award LOOKS like and how it's earned, but carries no per-user data.
// Real earned awards live in a member's own Achievement House; this is a
// catalog of designs, not a personal trophy list.
//
// Two kinds, one pair per category:
// - "goal" trophies mirror the real rule in postsController.achievements():
//   a goal's checklist must be non-empty and every subtask marked done.
//   Each one uses an icon that stands for its category, not a generic cup.
// - Consistency badges require seven consecutive days on the same category task.
//   Personal unlock progress is shown on /today.
const GOAL_ICONS = { health: '💪', wealth: '💎', relationships: '🫂' };

export const AWARD_COLLECTIONS = CATEGORIES.map((cat) => ({
  category: cat.id,
  label: cat.label,
  emoji: cat.emoji,
  awards: [
    {
      id: `${cat.id}-goal`,
      kind: 'goal',
      icon: GOAL_ICONS[cat.id],
      name: `${cat.label} Goal Trophy`,
      rule: `Set a goal tagged to ${cat.label}, break it into tasks, and check off every single one. The moment the last task is done, this trophy is added to your Achievement House.`,
    },
    {
      id: `${cat.id}-consistency`,
      kind: 'consistency',
      icon: '🔥',
      name: `${cat.label} Consistency Badge`,
      rule: `Check in with a photo for the same ${cat.label.toLowerCase()} task on 7 consecutive calendar days. Multiple photos on one day count once toward the streak. Once earned, your badge stays unlocked.`,
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
    blurb: "Earned after a 7-day streak on a task in this category. The badge stays earned when the streak ends.",
  },
};

// A rare fourth design: earning every category's Goal Trophy at once. This
// one IS real — src/lib/trifecta.js (backend) grants it the moment a
// member has a completed goal in health, wealth, and relationships all at
// once, recorded permanently in the special_awards table. The gallery
// still shows it with the same generic "not yet earned" preview treatment
// as everything else here, since this page never checks the viewer's own
// progress — the real, personalized version of this award lives in each
// member's own Achievement House.
export const TRIFECTA_AWARD = {
  id: 'trifecta',
  icon: '🏆',
  name: 'Trifecta Award',
  rule: "Earn the Health, Wealth, and Relationships Goal Trophies at the same time, and this rare, all-category award is yours — proof you're building the whole life, not just one part of it.",
};
