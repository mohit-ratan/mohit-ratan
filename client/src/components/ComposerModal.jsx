import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES } from '../lib/format';
import { LOOK_RECIPES, getRecipeById, applyLookToImage } from '../lib/looks';

const MAX_SUBTASKS = 15;

const VIBE_ITEMS = [{ id: '', emoji: '⚪', label: 'No look' }, ...LOOK_RECIPES];

// One modal used for both "Create post" (kind="post") and "Add to your
// story" (kind="story") — the two flows only differ by the category
// picker and the endpoint/labels used.
export default function ComposerModal({ kind, onClose, onCreated, initialGoalTask }) {
  const { user } = useAuth();
  const showToast = useToast();
  const fileInputRef = useRef(null);

  const [media, setMedia] = useState(null); // { file, originalFile, previewUrl, kind: 'image'|'video', styled }
  const [chosenCat, setChosenCat] = useState(initialGoalTask?.category || CATEGORIES[0].id);
  const [chosenVibeId, setChosenVibeId] = useState('');
  const [vibeLabel, setVibeLabel] = useState('');
  const [tagRaw, setTagRaw] = useState(initialGoalTask?.tag || '');
  const [availableGoals, setAvailableGoals] = useState([]);
  const [taskIndex, setTaskIndex] = useState(initialGoalTask ? String(initialGoalTask.index) : '');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingTags, setExistingTags] = useState(null); // Set, or null while loading
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalSubtasks, setGoalSubtasks] = useState([]);

  const isPost = kind === 'post';
  const title = isPost ? 'Create post' : 'Add to your story';
  const normalizedTag = tagRaw.replace(/^#/, '').toLowerCase().slice(0, 24);
  const linkedGoal = availableGoals.find((item) => item.tag === normalizedTag);
  const selectedTask = taskIndex !== '' ? linkedGoal?.goal.subtasks[Number(taskIndex)] : null;
  const isNewTag = isPost && !!normalizedTag && !!existingTags && !existingTags.has(normalizedTag);

  useEffect(() => {
    if (!isPost || !user) return;
    let cancelled = false;
    api.get('/api/posts/achievements', { params: { authorId: user.id } })
      .then(({ data }) => { if (!cancelled) { setExistingTags(new Set(data.tags)); setAvailableGoals([...data.goals, ...data.achievements]); } })
      .catch(() => { if (!cancelled) setExistingTags(new Set()); });
    return () => { cancelled = true; };
  }, [isPost, user]);

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

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('That file is over the 20 MB limit.', true);
      e.target.value = '';
      return;
    }
    const fileKind = file.type.startsWith('video') ? 'video' : 'image';
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia({
      file,
      originalFile: file,
      kind: fileKind,
      previewUrl: URL.createObjectURL(file),
      styled: false,
    });
  }

  function removeMedia() {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function chooseVibe(id) {
    setChosenVibeId(id);
    const recipe = id ? getRecipeById(id) : null;
    setVibeLabel(recipe ? recipe.label : '');
  }

  async function handleGenerateLook() {
    if (!chosenVibeId) {
      showToast('Pick a look first — tap one of the icons beside your photo.', true);
      return;
    }
    const recipe = getRecipeById(chosenVibeId);
    setGenerating(true);
    try {
      const sourceFile = media.originalFile || media.file;
      const blob = await applyLookToImage(sourceFile, recipe);
      const styledFile = new File([blob], 'styled.jpg', { type: 'image/jpeg' });
      if (media.previewUrl) URL.revokeObjectURL(media.previewUrl);
      setMedia({
        ...media,
        originalFile: sourceFile,
        file: styledFile,
        previewUrl: URL.createObjectURL(styledFile),
        styled: true,
      });
      showToast('Look applied!');
    } catch (err) {
      showToast(`Couldn't style that photo: ${err.message || 'please try again'}`, true);
    } finally {
      setGenerating(false);
    }
  }

  function resetLook() {
    if (!media.originalFile) return;
    if (media.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia({ ...media, file: media.originalFile, previewUrl: URL.createObjectURL(media.originalFile), styled: false });
  }

  async function handleSubmit() {
    if (!media) {
      showToast('Attach a photo or video to post.', true);
      return;
    }
    if (generating) {
      showToast('Hang on — your AI look is still being applied.', true);
      return;
    }
    if (isPost && !chosenCat) {
      showToast('Pick a category.', true);
      return;
    }

    if (taskIndex !== '' && (!selectedTask || media.kind !== 'image')) {
      showToast('Choose a goal task and upload a photo to complete it.', true);
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('media', media.file);
      form.append('vibe', vibeLabel.slice(0, 60));
      form.append('tag', normalizedTag);
      form.append('aiStyled', String(!!(media.kind === 'image' && media.styled)));
      if (isPost) form.append('category', selectedTask ? linkedGoal.category : chosenCat);
      if (isPost && selectedTask) {
        form.append('goalTaskIndex', taskIndex);
        form.append('goalTaskText', selectedTask.text);
      }
      if (isNewTag) {
        const cleanSubtasks = goalSubtasks.filter((t) => t.trim());
        if (goalTargetDate || cleanSubtasks.length) {
          form.append('goalTargetDate', goalTargetDate);
          form.append('goalSubtasks', JSON.stringify(cleanSubtasks));
        }
      }

      const endpoint = isPost ? '/api/posts' : '/api/stories';
      const { data } = await api.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });

      showToast(data.goalCompleted ? '🏆 Goal complete! Your award is in your Achievement House.' : data.taskCompleted ? 'Photo posted — task completed and progress updated!' : isPost ? 'Posted!' : 'Added to your story!');
      onCreated?.();
      onClose();
    } catch (err) {
      showToast(`Couldn't ${isPost ? 'post' : 'share your story'}: ${err.message || 'please try again'}`, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box modal-box-stacked">
        <div className="media-and-look-row">
          {media ? (
            <div className="modal-media-pane">
              {media.kind === 'video' ? (
                <video src={media.previewUrl} controls />
              ) : (
                <img src={media.previewUrl} alt="Selected media" />
              )}
              {media.kind === 'image' && (
                generating ? (
                  <div className="generate-bar"><span className="generate-status">Applying your look…</span></div>
                ) : (
                  <div className="generate-bar">
                    <button type="button" className="generate-btn" onClick={handleGenerateLook}>
                      ✨ {media.styled ? 'Re-apply look' : 'Generate AI look'}
                    </button>
                    {media.styled && (
                      <button type="button" className="link-btn" onClick={resetLook}>Use original photo</button>
                    )}
                  </div>
                )
              )}
              <button className="remove-media" type="button" aria-label="Remove photo or video" onClick={removeMedia}>✕</button>
            </div>
          ) : (
            <label className="modal-media-pane create-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10.5" r="1.6" />
                <path d="M21 15l-5-5-9 9" />
              </svg>
              <span>Select a photo or video</span>
            </label>
          )}

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
            <span className="modal-title">{title}</span>
            <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-detail-scroll">
            {isPost && (
              <div className="cat-choice-row">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`cat-choice${c.id === chosenCat ? ' chosen' : ''}`}
                    data-cat={c.id}
                    disabled={!!selectedTask}
                    onClick={() => setChosenCat(c.id)}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            )}
            <div className="composer-note">
              {media?.kind === 'image'
                ? 'Pick a look from the icons beside your photo, then tap "Generate AI look" to apply it.'
                : 'Pick a look from the icons beside your media — it shows as a glowing tag and styles video previews live.'}
            </div>
            <div className="tag-input-row">
              <input
                type="text"
                maxLength={24}
                placeholder="One word or hashtag (optional) — e.g. #grateful"
                value={tagRaw}
                onChange={(e) => { setTagRaw(e.target.value); setTaskIndex(''); }}
              />
              <span className="tag-hint">Just one word — no caption needed.</span>
            </div>
            {isPost && availableGoals.length > 0 && <div className="goal-setup">
              <label className="goal-setup-label" htmlFor="photo-goal">Update a goal with this photo</label>
              <select id="photo-goal" value={linkedGoal?.tag || ''} onChange={(e) => {
                const item = availableGoals.find((goal) => goal.tag === e.target.value);
                setTagRaw(item?.tag || ''); setTaskIndex('');
                if (item) setChosenCat(item.category);
              }}>
                <option value="">No goal selected</option>
                {availableGoals.map((item) => <option key={item.tag} value={item.tag}>#{item.tag}</option>)}
              </select>
              {linkedGoal && <>
                <label htmlFor="photo-task">Which task does this photo complete?</label>
                <select id="photo-task" value={taskIndex} onChange={(e) => { setTaskIndex(e.target.value); setChosenCat(linkedGoal.category); }}>
                  <option value="">Post without completing a task</option>
                  {linkedGoal.goal.subtasks.map((task, index) => <option key={index} value={index}>{task.done ? '✓ ' : ''}{task.text}</option>)}
                </select>
                <span className="tag-hint">Sharing a photo marks the selected task complete. Each task counts once toward your goal.</span>
              </>}
            </div>}
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
              {submitting ? 'Sharing…' : isPost ? 'Share' : 'Share to story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
