import { useState } from 'react';

const MAX_TASKS = 15;

// Shared editor for a goal's task list, used by the composer, edit-post
// modal, and achievement detail modal (previously three separate copies
// of the same add/update/remove logic). Each task can optionally hold one
// nested level of subtasks — tracked exactly like a task (its own days +
// photo progress), just not required to complete the task above it.
export default function TaskListEditor({ tasks, onChange, depth = 0 }) {
  const [expanded, setExpanded] = useState(() => new Set());

  function updateAt(index, patch) {
    onChange(tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function removeAt(index) {
    onChange(tasks.filter((_, i) => i !== index));
  }
  function add() {
    if (tasks.length >= MAX_TASKS) return;
    onChange([...tasks, { text: '', targetDays: 1, subtasks: [] }]);
  }
  function toggleExpanded(index) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  return (
    <div className={depth === 0 ? 'task-list-editor' : 'task-list-editor task-list-editor-nested'}>
      {tasks.map((task, index) => {
        const subtasks = task.subtasks || [];
        const isExpanded = expanded.has(index);
        return (
          <div className="task-editor-item" key={index}>
            <div className="goal-subtask-row">
              <input
                type="text"
                placeholder={depth === 0 ? `Task ${index + 1}` : `Subtask ${index + 1}`}
                maxLength={140}
                value={task.text}
                onChange={(e) => updateAt(index, { text: e.target.value.slice(0, 140) })}
              />
              <label className="task-days-input">
                Days
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={task.targetDays || 1}
                  onChange={(e) => updateAt(index, { targetDays: e.target.value })}
                />
              </label>
              <button type="button" className="goal-remove-btn" onClick={() => removeAt(index)}>✕</button>
            </div>
            {depth === 0 && (
              <div className="task-editor-subtask-toggle">
                <button type="button" className="goal-add-btn" onClick={() => toggleExpanded(index)}>
                  {isExpanded ? 'Hide subtasks' : subtasks.length ? `Subtasks (${subtasks.length}) ▾` : '+ Add subtask (optional)'}
                </button>
              </div>
            )}
            {depth === 0 && isExpanded && (
              <div className="task-editor-nested">
                <TaskListEditor tasks={subtasks} onChange={(next) => updateAt(index, { subtasks: next })} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
      {tasks.length < MAX_TASKS && (
        <button type="button" className="goal-add-btn" onClick={add}>{depth === 0 ? '+ Add task' : '+ Add subtask'}</button>
      )}
    </div>
  );
}
