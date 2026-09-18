import useDialog from '../hooks/useDialog';
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
  const lookRequest = useRef(0);
  const uploadInFlight = useRef(false);
  const [uploadPercent, setUploadPercent] = useState(null);
  const previewUrlRef = useRef(null);

  useEffect(() => () => {
    lookRequest.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function updatePreview(next) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = next?.previewUrl || null;
    setMedia(next);
  }

  const [media, setMedia] = useState(null); // { file, originalFile, previewUrl, kind: 'image'|'video', styled }
  const [chosenCat, setChosenCat] = useState(initialGoalTask?.category || CATEGORIES[0].id);
  const [visibility, setVisibility] = useState('friends');
  const [chosenVibeId, setChosenVibeId] = useState('');
  const [vibeLabel, setVibeLabel] = useState('');
  const [tagRaw, setTagRaw] = useState(initialGoalTask?.tag || '');
  const [availableGoals, setAvailableGoals] = useState([]);
  const [taskIndex, setTaskIndex] = useState(initialGoalTask ? String(initialGoalTask.index) : '');
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useDialog(onClose, submitting);
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
      .catch(() => { if (!cancelled) showToast('Could not load your goals. Close and reopen the editor to try again.', true); });
    return () => { cancelled = true; };
  }, [isPost, user, showToast]);

  function addSubtask() {
    if (goalSubtasks.length >= MAX_SUBTASKS) return;
    setGoalSubtasks((s) => [...s, { text: '', targetDays: 1 }]);
  }
  function updateSubtask(i, text) {
    setGoalSubtasks((s) => s.map((t, idx) => (idx === i ? { ...t, text: text.slice(0, 140) } : t)));
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
    const nextMedia = {
      file,
      originalFile: file,
      kind: fileKind,
      previewUrl: URL.createObjectURL(file),
      styled: false,
    };
    updatePreview(nextMedia);
    applySelectedLook(nextMedia, chosenVibeId);
  }

  function removeMedia() {
    lookRequest.current += 1;
    setGenerating(false);
    updatePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function chooseVibe(id) {
    setChosenVibeId(id);
    const recipe = id ? getRecipeById(id) : null;
    setVibeLabel(recipe ? recipe.label : '');
    applySelectedLook(media, id);
  }

  async function applySelectedLook(source, id) {
    const request = ++lookRequest.current;
    const recipe = id ? getRecipeById(id) : null;
    if (!source || source.kind !== 'image') {
      setGenerating(false);
      return;
    }
    const originalFile = source.originalFile || source.file;
    if (!recipe) {
      updatePreview({ ...source, file: originalFile, previewUrl: URL.createObjectURL(originalFile), styled: false });
      setGenerating(false);
      return;
    }
    setGenerating(true);
    try {
      const blob = await applyLookToImage(originalFile, recipe);
      // Rapid filter changes, photo removal, and closing cannot restore stale renders.
      if (request !== lookRequest.current) return;
      const styledFile = new File([blob], 'styled.jpg', { type: 'image/jpeg' });
      updatePreview({ ...source, originalFile, file: styledFile, previewUrl: URL.createObjectURL(styledFile), styled: true });
    } catch (err) {
      if (request !== lookRequest.current) return;
      setChosenVibeId('');
      setVibeLabel('');
      updatePreview({ ...source, file: originalFile, previewUrl: URL.createObjectURL(originalFile), styled: false });
      showToast(`Couldn't apply that filter: ${err.message || 'please try again'}`, true);
    } finally {
      if (request === lookRequest.current) setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (uploadInFlight.current) return;
    if (!media) {
      showToast('Attach a photo or video to post.', true);
      return;
    }
    if (generating) {
      showToast('Your filter is still being applied. Please wait a moment.', true);
      return;
    }
    if (isPost && !chosenCat) {
      showToast('Pick a category.', true);
      return;
    }

    if (taskIndex !== '' && (!selectedTask || media.kind !== 'image')) {
      showToast('Choose a goal task and upload a photo to record progress.', true);
      return;
    }
    if (goalSubtasks.some((task) => task.text.trim() && (!Number.isInteger(Number(task.targetDays ?? 1)) || Number(task.targetDays ?? 1) < 1 || Number(task.targetDays ?? 1) > 3650))) {
      showToast('Enter a whole number of days from 1 to 3650 for each task.', true);
      return;
    }
    uploadInFlight.current = true;
    setSubmitting(true);
    setUploadPercent(null);
    try {
      const form = new FormData();
      let uploadFile = media.file;
      // Plain photos otherwise retain full camera resolution and can be 20 MB.
      if (!isPost && media.kind === 'image' && !media.styled && media.file.type !== 'image/gif') {
        const blob = await applyLookToImage(media.file, { filter: 'none' });
        if (blob.size < media.file.size) uploadFile = new File([blob], 'status.jpg', { type: 'image/jpeg' });
      }
      form.append('media', uploadFile);
      form.append('vibe', vibeLabel.slice(0, 60));
      form.append('tag', normalizedTag);
      form.append('aiStyled', String(!!(media.kind === 'image' && media.styled)));
      if (isPost) form.append('category', selectedTask ? linkedGoal.category : chosenCat);
      if (isPost) form.append('visibility', visibility);
      if (isPost && selectedTask) {
        form.append('goalTaskIndex', taskIndex);
        form.append('goalTaskText', selectedTask.text);
        form.append('goalTaskId', selectedTask.id);
      }
      if (isNewTag) {
        const cleanSubtasks = goalSubtasks.filter((t) => t.text.trim());
        if (goalTargetDate || cleanSubtasks.length) {
          form.append('goalTargetDate', goalTargetDate);
          form.append('goalSubtasks', JSON.stringify(cleanSubtasks));
        }
      }

      const endpoint = isPost ? '/api/posts' : '/api/stories';
      const { data } = await api.post(endpoint, form, {
        onUploadProgress: ({ loaded, total }) => {
          if (total) setUploadPercent(Math.round(loaded / total * 100));
        },
      });

      showToast(data.goalCompleted ? '🏆 Goal complete! Your award is in your Achievement House.' : data.targetDays ? `Photo posted — ${data.completedDays} of ${data.targetDays} days complete!` : isPost ? 'Posted!' : 'Added to your story!');
      onCreated?.(data.story ? { story: { ...data.story, authorId: user.id, authorName: user.displayName, authorPhotoUrl: user.photoUrl } } : undefined);
      onClose();
    } catch (err) {
      showToast(`Couldn't ${isPost ? 'post' : 'share your story'}: ${err.message || 'please try again'}`, true);
    } finally {
      uploadInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop composer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} className="modal-box composer-workspace" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <header className="composer-workspace-header">
          <div><span className="composer-eyebrow">PACKSOMEWORK · YOUR DAILY PROGRESS</span><h2 id="composer-title">{title}</h2></div>
          <button className="composer-close" type="button" aria-label="Close editor" disabled={submitting} onClick={onClose}>✕</button>
        </header>
        <div className="media-and-look-row">
          {media ? (
            <div className="modal-media-pane">
              {media.kind === 'video' ? (
                <video src={media.previewUrl} controls style={{ filter: getRecipeById(chosenVibeId)?.filter }} />
              ) : (
                <img src={media.previewUrl} alt="Selected media" />
              )}
              {generating && <div className="generate-bar"><span className="generate-status" role="status">Applying filter…</span></div>}
              <button className="remove-media" type="button" aria-label="Remove photo or video" disabled={submitting} onClick={removeMedia}>✕</button>
            </div>
          ) : (
            <label className="modal-media-pane create-dropzone" role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}>
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
                aria-label={it.label}
                aria-pressed={chosenVibeId === it.id}
                disabled={submitting}
                onClick={() => chooseVibe(it.id)}
              >
                {it.emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-detail-pane">
          <div className="composer-panel-heading"><span className="composer-eyebrow">{isPost ? 'MAKE THIS MOMENT COUNT' : 'SHARE A MOMENT'}</span><h3>{isPost ? 'Your post & goals' : 'Your story'}</h3><p>{isPost ? 'Choose a category, connect a task, and track your progress.' : 'Add a tag and share a little of your day.'}</p></div>
          <fieldset disabled={submitting} className="modal-detail-scroll composer-fields">
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
            {isPost && (
              <div className="visibility-choice-row">
                <label className="composer-field-label">Who can see this post?</label>
                <div className="visibility-choice-options">
                  <button
                    type="button"
                    className={`visibility-choice${visibility === 'friends' ? ' chosen' : ''}`}
                    onClick={() => setVisibility('friends')}
                  >
                    👥 Friends only
                  </button>
                  <button
                    type="button"
                    className={`visibility-choice${visibility === 'public' ? ' chosen' : ''}`}
                    onClick={() => setVisibility('public')}
                  >
                    🌐 Public
                  </button>
                </div>
                <span className="tag-hint">{visibility === 'public' ? 'Anyone can see this post, even people who don’t follow you.' : 'Only people you’ve accepted as followers can see this post.'}</span>
              </div>
            )}
            <div className="composer-note">
              {media?.kind === 'image'
                ? 'Tap a filter to apply it automatically. Choose No look to restore your original photo.'
                : 'Tap a filter to preview it on your video.'}
            </div>
            <div className="tag-input-row">
              <label className="composer-field-label" htmlFor="composer-tag">Post tag</label>
              <input
                type="text"
                id="composer-tag"
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
                <label htmlFor="photo-task">Which task is this photo for?</label>
                <select id="photo-task" value={taskIndex} onChange={(e) => { setTaskIndex(e.target.value); setChosenCat(linkedGoal.category); }}>
                  <option value="">Post without updating a task</option>
                  {linkedGoal.goal.subtasks.map((task, index) => <option key={index} value={index}>{task.done ? '✓ ' : ''}{task.text} ({task.completedDays || 0}/{task.targetDays || 1} days)</option>)}
                </select>
                <span className="tag-hint">Each photo adds one day of progress to this task, up to its target. Multiple uploads on the same day each count.</span>
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
                {goalSubtasks.map((task, i) => (
                  <div className="goal-subtask-row" key={i}>
                    <input
                      type="text"
                      placeholder={`Subtask ${i + 1}`}
                      maxLength={140}
                      value={task.text}
                      onChange={(e) => updateSubtask(i, e.target.value)}
                    />
                    <label className="task-days-input">Days<input type="number" min="1" max="3650" value={task.targetDays} onChange={(e) => setGoalSubtasks((tasks) => tasks.map((t, index) => index === i ? { ...t, targetDays: e.target.value } : t))} /></label>
                    <button type="button" className="goal-remove-btn" onClick={() => removeSubtask(i)}>✕</button>
                  </div>
                ))}
                {goalSubtasks.length < MAX_SUBTASKS && (
                  <button type="button" className="goal-add-btn" onClick={addSubtask}>+ Add subtask</button>
                )}
              </div>
            )}
          </fieldset>
          <div className="modal-detail-footer">
            <span className="composer-share-note">{selectedTask ? `This photo adds 1 day toward “${selectedTask.text}”.` : 'A little progress, worth sharing.'}</span>
            <button
              className="pill-btn primary"
              type="button"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={submitting || generating || !media || (isPost && existingTags === null)}
              onClick={handleSubmit}
            >
              {submitting ? uploadPercent === null ? 'Preparing media…' : uploadPercent < 100 ? `Uploading ${uploadPercent}%…` : 'Saving…' : selectedTask ? 'Share photo & update progress →' : isPost ? 'Share post →' : 'Share to story →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
