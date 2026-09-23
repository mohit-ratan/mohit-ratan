import useDialog from '../hooks/useDialog';
import { useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CAT_MAP, goalStatusLabel, hasInvalidTaskDays } from '../lib/format';
import PostGrid from './PostGrid';
import PostDetailModal from './PostDetailModal';
import GoalTemplatePicker from './GoalTemplatePicker';
import TaskListEditor from './TaskListEditor';

// Shows the full gallery of posts behind one achievement (tag). Matches
// PostDetailModal's chrome (.modal-backdrop/.modal-box) but isn't built on
// it directly — this is a gallery of N posts, not one post's detail.
export default function AchievementDetailModal({ achievement, isMe, onChanged, onClose, onOpenAuthor, onOpenTag }) {
  const showToast = useToast();
  const dialogRef = useDialog(onClose);
  const [zoomedPost, setZoomedPost] = useState(null);
  const [goal, setGoal] = useState(achievement.goal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editSubtasks, setEditSubtasks] = useState([]);
  const [savingGoal, setSavingGoal] = useState(false);
  const cat = CAT_MAP[achievement.category] || CAT_MAP.health;
  const status = goalStatusLabel(goal);

  function startEditGoal() {
    setEditDate(goal?.targetDate || '');
    setEditSubtasks(goal?.subtasks ? goal.subtasks.map((t) => ({ ...t })) : []);
    setEditingGoal(true);
  }
  async function saveGoal() {
    if (hasInvalidTaskDays(editSubtasks)) {
      showToast('Enter a whole number of days from 1 to 3650 for each task.', true);
      return;
    }
    setSavingGoal(true);
    try {
      const subtasks = editSubtasks.filter((t) => t.text.trim());
      const { data } = await api.put(`/api/goals/${achievement.tag}`, { targetDate: editDate, subtasks });
      setGoal(data);
      setEditingGoal(false);
      onChanged?.();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSavingGoal(false);
    }
  }

  async function deleteGoal() {
    if (!window.confirm("Delete this goal? Your posts won't be affected.")) return;
    try {
      await api.delete(`/api/goals/${achievement.tag}`);
      setGoal(null);
      onChanged?.();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} className="modal-box modal-box-gallery" role="dialog" aria-modal="true" aria-label="Goal details">
        <div className="modal-detail-pane">
          <div className="modal-detail-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="post-author">#{achievement.tag}</span>
              <div className="post-meta">
                <span className={`cat-label ${cat.id}`}>{cat.emoji} {cat.label}</span>
                <span>· {achievement.count} post{achievement.count === 1 ? '' : 's'}</span>
              </div>
            </div>
            <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-detail-scroll">
            {editingGoal ? (
              <div className="goal-setup">
                <div className="goal-setup-label">🎯 Goal for #{achievement.tag}</div>
                {!editSubtasks.length && (
                  <GoalTemplatePicker
                    category={achievement.category}
                    onApply={(subtasks, date) => { setEditSubtasks(subtasks); setEditDate(date); }}
                  />
                )}
                <input
                  type="date"
                  className="goal-date-input"
                  value={editDate || ''}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                <TaskListEditor tasks={editSubtasks} onChange={setEditSubtasks} />
                <div className="goal-edit-actions">
                  <button type="button" className="pill-btn primary" disabled={savingGoal} onClick={saveGoal}>
                    {savingGoal ? 'Saving…' : 'Save goal'}
                  </button>
                  <button type="button" className="goal-remove-btn" onClick={() => setEditingGoal(false)}>Cancel</button>
                </div>
              </div>
            ) : goal ? (
              <div className="goal-section">
                <div className="goal-section-head">
                  {status && <span className={`goal-status-chip goal-status-${status.tone}`}>{status.text}</span>}
                  {isMe && (
                    <div className="goal-edit-actions">
                      <button type="button" className="goal-remove-btn" onClick={startEditGoal}>Edit goal</button>
                      <button type="button" className="goal-remove-btn" onClick={deleteGoal}>Delete goal</button>
                    </div>
                  )}
                </div>
                {goal.subtasks.length > 0 && (
                  <ul className="goal-subtask-list">
                    {goal.subtasks.map((t, i) => (
                      <li key={i}>
                        <label className={isMe ? '' : 'goal-subtask-readonly'}>
                          <span aria-label={t.done ? 'Completed' : 'In progress'}>{t.done ? '✓' : '○'}</span>
                          <span className={t.done ? 'goal-subtask-done' : ''}>{t.text} · {t.completedDays || 0}/{t.targetDays || 1} days</span>
                        </label>
                        {t.subtasks?.length > 0 && (
                          <ul className="goal-subtask-list goal-subtask-list-nested">
                            {t.subtasks.map((sub, si) => (
                              <li key={si}>
                                <label className={isMe ? '' : 'goal-subtask-readonly'}>
                                  <span aria-label={sub.done ? 'Completed' : 'In progress'}>{sub.done ? '✓' : '○'}</span>
                                  <span className={sub.done ? 'goal-subtask-done' : ''}>{sub.text} · {sub.completedDays || 0}/{sub.targetDays || 1} days</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : isMe ? (
              <button type="button" className="goal-add-btn" onClick={startEditGoal}>+ Set a goal for #{achievement.tag}</button>
            ) : null}
            <PostGrid posts={achievement.posts} onOpen={setZoomedPost} emptyIcon="🖼️" emptyTitle="" emptyText="" />
          </div>
        </div>
      </div>
      {zoomedPost && (
        <PostDetailModal
          post={zoomedPost}
          onClose={() => setZoomedPost(null)}
          onChanged={onChanged}
          onDeleted={onClose}
          onOpenAuthor={(id) => { setZoomedPost(null); onClose(); onOpenAuthor(id); }}
          onOpenTag={(tag) => { setZoomedPost(null); onClose(); onOpenTag(tag); }}
        />
      )}
    </div>
  );
}
