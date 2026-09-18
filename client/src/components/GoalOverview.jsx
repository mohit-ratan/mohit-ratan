import { useEffect, useState } from 'react';
import { CATEGORIES, goalStatusLabel } from '../lib/format';

export default function GoalOverview({ goals, onOpen, onUploadTask }) {
  // Keep deadlines current when this page stays open overnight.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="goal-overview" aria-labelledby="goal-overview-title">
      <div className="goal-overview-heading">
        <span className="house-eyebrow">YOUR GOALS AT A GLANCE</span>
        <h2 id="goal-overview-title">Every goal. Every next step.</h2>
        <p>Track your tasks and deadlines across all three parts of life.</p>
      </div>
      <div className="goal-category-grid">
        {CATEGORIES.map((category) => {
          const items = goals.filter((item) => item.category === category.id);
          const completed = items.filter((item) => item.goal.completed).length;
          const tasks = items.flatMap((item) => item.goal.subtasks);
          const done = tasks.filter((task) => task.done).length;
          return (
            <section key={category.id} className={`goal-category house-floor-${category.id}`} aria-labelledby={`goals-${category.id}`}>
              <h3 id={`goals-${category.id}`}>{category.emoji} {category.label}</h3>
              <dl className="goal-category-stats">
                <div><dt>Total goals</dt><dd>{items.length}</dd></div>
                <div><dt>In progress</dt><dd>{items.length - completed}</dd></div>
                <div><dt>Completed</dt><dd>{completed}</dd></div>
              </dl>
              <div className="goal-task-summary"><span>{done} of {tasks.length} tasks complete</span><strong>{tasks.length ? Math.round(done / tasks.length * 100) : 0}%</strong></div>
              <progress value={done} max={tasks.length || 1} aria-label={`${category.label} tasks completed`} />
              {!items.length && <p className="goal-category-empty">No goals set in {category.label.toLowerCase()} yet. Add a goal and tasks when you create a tagged post.</p>}
              {[...items].sort((a, b) => Number(a.goal.completed) - Number(b.goal.completed) || (a.goal.targetDate || '9999').localeCompare(b.goal.targetDate || '9999')).map((item) => {
                const status = goalStatusLabel(item.goal, now) || { text: 'No target date', tone: 'unset' };
                const taskCount = item.goal.subtasks.length;
                const checked = item.goal.subtasks.filter((task) => task.done).length;
                const percent = taskCount ? Math.round(checked / taskCount * 100) : 0;
                return (
                  <article className="goal-summary-card" key={item.tag}>
                    <div className="goal-summary-title"><h4>#{item.tag}</h4><span className={`goal-deadline goal-deadline-${status.tone}`}>{status.text}</span></div>
                    {item.goal.targetDate && <p className="goal-target-date">Target: <time dateTime={item.goal.targetDate}>{new Date(`${item.goal.targetDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time></p>}
                    <div className="goal-task-summary goal-progress-label"><span>{checked} of {taskCount} tasks complete</span><strong>{percent}%</strong></div>
                    <progress className="goal-progress-bar" value={checked} max={taskCount || 1} aria-label={`#${item.tag} task progress`} aria-valuetext={`${checked} of ${taskCount} tasks complete, ${percent}%`} />
                    {taskCount ? <ul className="goal-summary-tasks">{item.goal.subtasks.map((task, index) => (
                      <li key={index} className={task.done ? 'is-complete' : ''}><span aria-label={task.done ? 'Completed' : 'Pending'}>{task.done ? '✓' : '○'}</span><span>{task.text}</span>{!task.done && <button type="button" className="goal-task-photo" aria-label={`Upload photo for ${task.text}`} onClick={() => onUploadTask({ tag: item.tag, category: item.category, index })}>＋ Photo</button>}</li>
                    ))}</ul> : <p className="goal-category-empty">Add tasks to start working toward an award.</p>}
                    <button type="button" className="house-enter-btn" onClick={() => onOpen(item)}>{item.goal.completed ? 'View achievement' : 'Manage tasks'} →</button>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </section>
  );
}
