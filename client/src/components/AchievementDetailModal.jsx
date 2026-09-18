import { useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CAT_MAP, goalStatusLabel } from '../lib/format';
import PostGrid from './PostGrid';
import PostDetailModal from './PostDetailModal';

const MAX_SUBTASKS = 15;

// Shows the full gallery of posts behind one achievement (tag). Matches
// PostDetailModal's chrome (.modal-backdrop/.modal-box) but isn't built on
// it directly — this is a gallery of N posts, not one post's detail.
export default function AchievementDetailModal({ achievement, isMe, onChanged, onClose, onOpenAuthor, onOpenTag }) {
  const showToast = useToast();
  const [zoomedPost, setZoomedPost] = useState(null);
  const [goal, setGoal] = useState(achievement.goal);
  const [editingGoal, setEditingGoal] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editSubtasks, setEditSubtasks] = useState([]);
  const [savingGoal, setSavingGoal] = useState(false);
  const cat = CAT_MAP[achievement.category] || CAT_MAP.health;
  const status = goalStatusLabel(goal);

  async function toggleSubtask(index) {
    if (!isMe) return;
    const wasCompleted = !!goal?.completed;
    try {
      const { data } = await api.patch(`/api/goals/${achievement.tag}/subtasks/${index}`);
      setGoal((g) => ({ ...g, subtasks: data.subtasks, completed: data.completed }));
      if (!wasCompleted && data.completed) {
        showToast(`🏆 Trophy earned: #${achievement.tag}!`);
      }
      onChanged?.();
    } catch (err) {
      showToast(err.message, true);
    }
  }

  function startEditGoal() {
    setEditDate(goal?.targetDate || '');
    setEditSubtasks(goal?.subtasks ? goal.subtasks.map((t) => ({ ...t })) : []);
    setEditingGoal(true);
  }
  function addEditSubtask() {
    if (editSubtasks.length >= MAX_SUBTASKS) return;
    setEditSubtasks((s) => [...s, { text: '', done: false }]);
  }
  function updateEditSubtask(i, text) {
    setEditSubtasks((s) => s.map((t, idx) => (idx === i ? { ...t, text: text.slice(0, 140) } : t)));
  }
  function removeEditSubtask(i) {
    setEditSubtasks((s) => s.filter((_, idx) => idx !== i));
  }

  async function saveGoal() {
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
      <div className="modal-box modal-box-gallery">
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
                <input
                  type="date"
                  className="goal-date-input"
                  value={editDate || ''}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                {editSubtasks.map((t, i) => (
                  <div className="goal-subtask-row" key={i}>
                    <input
                      type="text"
                      placeholder={`Subtask ${i + 1}`}
                      maxLength={140}
                      value={t.text}
                      onChange={(e) => updateEditSubtask(i, e.target.value)}
                    />
                    <button type="button" className="goal-remove-btn" onClick={() => removeEditSubtask(i)}>✕</button>
                  </div>
                ))}
                {editSubtasks.length < MAX_SUBTASKS && (
                  <button type="button" className="goal-add-btn" onClick={addEditSubtask}>+ Add subtask</button>
                )}
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
                          <input type="checkbox" checked={t.done} disabled={!isMe} onChange={() => toggleSubtask(i)} />
                          <span className={t.done ? 'goal-subtask-done' : ''}>{t.text}</span>
                        </label>
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
