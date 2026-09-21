// A handful of pre-built subtask lists to lower the friction of setting up
// a well-scoped goal — a vague or badly-structured goal is often why
// people abandon it early, more than the habit itself being hard.
export const GOAL_TEMPLATES = [
  {
    id: 'fitness-habit',
    category: 'health',
    label: '💪 30-Day Fitness Habit',
    subtasks: [
      { text: 'Walk or exercise for 20 minutes', targetDays: 30 },
      { text: 'Drink 8 glasses of water', targetDays: 30 },
      { text: 'Get 7+ hours of sleep', targetDays: 30 },
    ],
  },
  {
    id: 'save-consistently',
    category: 'wealth',
    label: '💰 Save Consistently',
    subtasks: [
      { text: "Track today's expenses", targetDays: 30 },
      { text: 'Have a no-spend day', targetDays: 10 },
      { text: 'Review your budget', targetDays: 4 },
    ],
  },
  {
    id: 'stay-connected',
    category: 'relationships',
    label: '❤️ Stay Connected',
    subtasks: [
      { text: 'Reach out to someone you care about', targetDays: 10 },
      { text: "Write down something you're grateful for", targetDays: 14 },
      { text: 'Plan quality time with someone', targetDays: 5 },
    ],
  },
];

// A reasonable target date for a template: today plus its longest subtask.
export function suggestedTargetDate(template) {
  const maxDays = Math.max(...template.subtasks.map((t) => t.targetDays));
  const d = new Date();
  d.setDate(d.getDate() + maxDays);
  return d.toISOString().slice(0, 10);
}
