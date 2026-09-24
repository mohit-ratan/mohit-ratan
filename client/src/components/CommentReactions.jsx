import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { isMemeReaction, memeReaction } from '../lib/reactions';
import ReactionPickerPanel from './ReactionPickerPanel';

// Toggling mirrors likes/follows elsewhere: reacting again with the same
// key removes it. Updates optimistically and reverts on failure, same
// pattern as the like button on the post itself.
export default function CommentReactions({ postId, commentId, reactions }) {
  const [list, setList] = useState(reactions || []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pending = useRef(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  async function toggle(key) {
    if (pending.current) return;
    pending.current = true;
    const before = list;
    const existing = list.find((r) => r.reaction === key);
    const next = existing
      ? existing.reactedByMe && existing.count <= 1
        ? list.filter((r) => r.reaction !== key)
        : list.map((r) => (r.reaction === key ? { ...r, count: r.reactedByMe ? r.count - 1 : r.count + 1, reactedByMe: !r.reactedByMe } : r))
      : [...list, { reaction: key, count: 1, reactedByMe: true }];
    setList(next);
    setPickerOpen(false);
    try {
      await api.post(`/api/posts/${postId}/comments/${commentId}/reactions`, { reaction: key });
    } catch {
      setList(before);
    } finally {
      pending.current = false;
    }
  }

  return (
    <div className="comment-reactions">
      {list.map((r) => {
        const meme = isMemeReaction(r.reaction) ? memeReaction(r.reaction) : null;
        return (
          <button
            key={r.reaction}
            type="button"
            className={`comment-reaction-pill${r.reactedByMe ? ' active' : ''}`}
            onClick={() => toggle(r.reaction)}
          >
            {meme ? <span className="comment-reaction-meme-mini" style={{ background: meme.bg }}>{meme.emoji}</span> : r.reaction}
            <span className="comment-reaction-count">{r.count}</span>
          </button>
        );
      })}
      <div className="comment-reaction-add-wrap" ref={wrapRef}>
        <button type="button" className="comment-reaction-add" aria-label="Add a reaction" onClick={() => setPickerOpen((v) => !v)}>
          😊+
        </button>
        {pickerOpen && <ReactionPickerPanel onPick={toggle} />}
      </div>
    </div>
  );
}
