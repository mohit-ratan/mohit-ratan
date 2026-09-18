import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { goalStatusLabel, taskProgress, tasksProgress } from '../lib/format';

export default function PostGoalPanel({ post }) {
  const [result, setResult] = useState({ loading: true, goal: null, error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get(`/api/goals/${encodeURIComponent(post.tag)}`, { params: { authorId: post.authorId } })
      .then(({ data }) => { if (!cancelled) setResult({ loading: false, goal: data.goal, error: null }); })
      .catch((error) => { if (!cancelled) setResult({ loading: false, goal: null, error: error.message }); });
    return () => { cancelled = true; };
  }, [post.authorId, post.tag, retry]);

  if (result.loading) return <p className="about-text" role="status">Loading goal and tasks…</p>;
  if (result.error) return <div className="post-goal-panel" role="alert"><p>{result.error}</p><button type="button" className="house-enter-btn" onClick={() => { setResult({ loading: true, goal: null, error: null }); setRetry((value) => value + 1); }}>Retry goal</button></div>;
  if (!result.goal) return null;

  const { goal } = result;
  const status = goalStatusLabel(goal);
  const progress = tasksProgress(goal.subtasks);
  const percent = progress.target ? Math.round(progress.completed / progress.target * 100) : 0;
  return (
    <section className={`post-goal-panel house-floor-${post.category}`} aria-labelledby="post-goal-heading">
      <div className="goal-summary-title"><h3 id="post-goal-heading">🎯 Goal & tasks</h3><span className={`goal-deadline goal-deadline-${status?.tone || 'unset'}`}>{status?.text || 'No target date'}</span></div>
      {goal.targetDate && <p className="goal-target-date">Target: <time dateTime={goal.targetDate}>{new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</time></p>}
      <div className="goal-task-summary"><span>{progress.completed} / {progress.target} task days logged</span><strong>{percent}%</strong></div>
      <progress value={progress.completed} max={progress.target || 1} aria-label="Goal progress" />
      <ul className="post-goal-tasks">
        {goal.subtasks.map((task) => {
          const { completed, target } = taskProgress(task);
          return <li key={task.id}>
            <div><strong>{task.done ? '✓ ' : ''}{task.text}</strong><span>{completed} / {target} days</span></div>
            <progress value={completed} max={target} aria-label={`${task.text} progress`} />
          </li>;
        })}
      </ul>
      {!goal.subtasks.length && <p className="about-text">No tasks added to this goal yet.</p>}
      <Link className="post-goal-link" to={`/profile/${post.authorId}/achievements?floor=${encodeURIComponent(post.category)}`}>View goal in Achievement House →</Link>
    </section>
  );
}
