import { useEffect, useState } from 'react';
import api, { mediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES } from '../lib/format';
import { LOOK_RECIPES, getRecipeById, pickLookRecipe } from '../lib/looks';

const MAX_SUBTASKS = 15;
const VIBE_ITEMS = [{ id: '', emoji: '⚪', label: 'No look' }, ...LOOK_RECIPES];

// Edits category/vibe/tag for an existing post — deliberately not built on
// ComposerModal, which is tightly wired around file upload + AI-look
// canvas baking that doesn't apply here (media isn't editable).
export default function EditPostModal({ post, onClose, onSaved }) {
  const { user } = useAuth();
  const showToast = useToast();

  const [chosenCat, setChosenCat] = useState(post.category);
  const [chosenVibeId, setChosenVibeId] = useState(
    LOOK_RECIPES.find((r) => r.label === post.vibe)?.id || ''
  );
  const [vibeLabel, setVibeLabel] = useState(post.vibe || '');
  const [tagRaw, setTagRaw] = useState(post.tag || '');
  const [submitting, setSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState(null);
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalSubtasks, setGoalSubtasks] = useState([]);

  const normalizedTag = tagRaw.replace(/^#/, '').toLowerCase().slice(0, 24);
  const isNewTag = !!normalizedTag && !!existingTags && !existingTags.has(normalizedTag);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get('/api/posts/achievements', { params: { authorId: user.id } })
      .then(({ data }) => { if (!cancelled) setExistingTags(new Set(data.achievements.map((a) => a.tag))); })
      .catch(() => { if (!cancelled) setExistingTags(new Set()); });
    return () => { cancelled = true; };
  }, [user]);

  function chooseVibe(id) {
    setChosenVibeId(id);
    const recipe = id ? getRecipeById(id) : null;
    setVibeLabel(recipe ? recipe.label : '');
  }

  function addSubtask() {
    if (goalSubtasks.length >= MAX_SUBTASKS) return;
    setGoalSubtasks((s) => [...s, '']);
  }
  function updateSubtask(i, text) {
    setGoalSubtasks((s) => s.map((t, idx) => (idx === i ? text.slice(0, 140) : t)));
  }
  function removeSubtask(i) {
    setGoalSubtasks((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = { category: chosenCat, vibe: vibeLabel.slice(0, 60), tag: normalizedTag };
      if (isNewTag) {
        const cleanSubtasks = goalSubtasks.filter((t) => t.trim());
        if (goalTargetDate || cleanSubtasks.length) {
          body.goalTargetDate = goalTargetDate;
          body.goalSubtasks = JSON.stringify(cleanSubtasks);
        }
      }
      await api.put(`/api/posts/${post.id}`, body);
      showToast('Post updated');
      onSaved?.();
    } catch (err) {
      showToast(`Couldn't save your changes: ${err.message || 'please try again'}`, true);
    } finally {
      setSubmitting(false);
    }
  }

  const isVideo = post.mediaType === 'video';
  const filter = vibeLabel ? pickLookRecipe(vibeLabel, chosenCat).filter : undefined;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box modal-box-stacked">
        <div className="media-and-look-row">
          <div className="modal-media-pane">
            {isVideo ? (
              <video src={mediaUrl(post.mediaUrl)} style={filter ? { filter } : undefined} muted loop controls />
            ) : (
              <img src={mediaUrl(post.mediaUrl)} alt="" style={filter ? { filter } : undefined} />
            )}
          </div>
          <div className="vibe-rail">
            <span className="vibe-rail-label">Look</span>
            {VIBE_ITEMS.map((it) => (
              <button
                key={it.id || 'none'}
                type="button"
                className={`vibe-choice${chosenVibeId === it.id ? ' chosen' : ''}`}
                title={it.label}
                onClick={() => chooseVibe(it.id)}
              >
                {it.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-detail-pane">
          <div className="modal-detail-head">
            <span className="modal-title">Edit post</span>
            <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-detail-scroll">
            <div className="cat-choice-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`cat-choice${c.id === chosenCat ? ' chosen' : ''}`}
                  data-cat={c.id}
                  onClick={() => setChosenCat(c.id)}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            <div className="tag-input-row">
              <input
                type="text"
                maxLength={24}
                placeholder="One word or hashtag (optional) — e.g. #grateful"
                value={tagRaw}
                onChange={(e) => setTagRaw(e.target.value)}
              />
              <span className="tag-hint">Just one word — no caption needed.</span>
            </div>
            {isNewTag && (
              <div className="goal-setup">
                <div className="goal-setup-label">🎯 Set a goal for #{normalizedTag}? (optional)</div>
                <input
                  type="date"
                  className="goal-date-input"
                  value={goalTargetDate}
                  onChange={(e) => setGoalTargetDate(e.target.value)}
                />
                {goalSubtasks.map((text, i) => (
                  <div className="goal-subtask-row" key={i}>
                    <input
                      type="text"
                      placeholder={`Subtask ${i + 1}`}
                      maxLength={140}
                      value={text}
                      onChange={(e) => updateSubtask(i, e.target.value)}
                    />
                    <button type="button" className="goal-remove-btn" onClick={() => removeSubtask(i)}>✕</button>
                  </div>
                ))}
                {goalSubtasks.length < MAX_SUBTASKS && (
                  <button type="button" className="goal-add-btn" onClick={addSubtask}>+ Add subtask</button>
                )}
              </div>
            )}
          </div>
          <div className="modal-detail-footer">
            <button
              className="pill-btn primary"
              type="button"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
