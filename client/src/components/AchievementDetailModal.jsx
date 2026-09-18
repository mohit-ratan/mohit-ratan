import { useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CAT_MAP, goalStatusLabel } from '../lib/format';
import PostGrid from './PostGrid';
import PostDetailModal from './PostDetailModal';

// Shows the full gallery of posts behind one achievement (tag). Matches
// PostDetailModal's chrome (.modal-backdrop/.modal-box) but isn't built on
// it directly — this is a gallery of N posts, not one post's detail.
export default function AchievementDetailModal({ achievement, isMe, onClose, onOpenAuthor, onOpenTag }) {
  const showToast = useToast();
  const [zoomedPost, setZoomedPost] = useState(null);
  const [goal, setGoal] = useState(achievement.goal);
  const cat = CAT_MAP[achievement.category] || CAT_MAP.health;
  const status = goalStatusLabel(goal);

  async function toggleSubtask(index) {
    if (!isMe) return;
    try {
      const { data } = await api.patch(`/api/goals/${achievement.tag}/subtasks/${index}`);
      setGoal((g) => ({ ...g, subtasks: data.subtasks, completed: data.completed }));
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
            {goal && (
              <div className="goal-section">
                {status && <span className={`goal-status-chip goal-status-${status.tone}`}>{status.text}</span>}
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
            )}
            <PostGrid posts={achievement.posts} onOpen={setZoomedPost} emptyIcon="🖼️" emptyTitle="" emptyText="" />
          </div>
        </div>
      </div>
      {zoomedPost && (
        <PostDetailModal
          post={zoomedPost}
          onClose={() => setZoomedPost(null)}
          onChanged={() => {}}
          onOpenAuthor={(id) => { setZoomedPost(null); onClose(); onOpenAuthor(id); }}
          onOpenTag={(tag) => { setZoomedPost(null); onClose(); onOpenTag(tag); }}
        />
      )}
    </div>
  );
}
