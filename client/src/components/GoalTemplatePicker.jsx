import { GOAL_TEMPLATES, suggestedTargetDate } from '../lib/goalTemplates';

// Puts the template matching the post's own category first, but still
// offers all of them — someone might reasonably want a "Stay Connected"
// goal even on a health-tagged post.
export default function GoalTemplatePicker({ category, onApply }) {
  const templates = [...GOAL_TEMPLATES].sort((a) => (a.category === category ? -1 : 0));
  return (
    <div className="goal-template-picker">
      <span className="composer-field-label">Or start from a template</span>
      <div className="goal-template-options">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            className="goal-template-btn"
            onClick={() => onApply(t.subtasks.map((s) => ({ ...s })), suggestedTargetDate(t))}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
