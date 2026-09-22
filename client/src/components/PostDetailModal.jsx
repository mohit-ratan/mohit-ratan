import useDialog from '../hooks/useDialog';
import { useEffect, useRef, useState } from 'react';
import api, { mediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CAT_MAP, timeAgo, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import Avatar from './Avatar';
import EditPostModal from './EditPostModal';
import PostGoalPanel from './PostGoalPanel';
import ComposerModal from './ComposerModal';
import { HeartIcon } from '../lib/icons';

export default function PostDetailModal({ post, onClose, onChanged, onDeleted, onOpenAuthor, onOpenTag }) {
  const { user } = useAuth();
  const showToast = useToast();
  const dialogRef = useDialog(onClose);
  const isMe = user?.id === post.authorId;
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const liking = useRef(false);
  const commenting = useRef(false);
  const [likePending, setLikePending] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const [commentError, setCommentError] = useState(null);
  const [commentRetry, setCommentRetry] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentActionPending, setCommentActionPending] = useState(false);
  const [photoTask, setPhotoTask] = useState(null);
  const [goalRefreshKey, setGoalRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    setCommentError(null);
    api.get(`/api/posts/${post.id}/comments`).then(({ data }) => {
      if (!cancelled) setComments(data.comments);
    }).catch((error) => { if (!cancelled) setCommentError(error.message); }).finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
  }, [post.id, commentRetry]);

  async function toggleLike() {
    if (liking.current) return;
    liking.current = true;
    setLikePending(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      await api.post(`/api/posts/${post.id}/like`);
      onChanged?.();
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      showToast(err.message, true);
    } finally { liking.current = false; setLikePending(false); }
  }

  async function submitComment() {
    const text = commentText.trim();
    if (!text || commenting.current) return;
    commenting.current = true;
    setCommentPending(true);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/comments`, { text });
      setComments((cs) => [...cs, { id: data.id, authorId: user.id, authorName: user.displayName, text, createdAt: Date.now() }]);
      setCommentText('');
      onChanged?.();
    } catch (err) {
      showToast(err.message, true);
    } finally { commenting.current = false; setCommentPending(false); }
  }

  function startEditComment(c) {
    setEditingCommentId(c.id);
    setEditCommentText(c.text);
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditCommentText('');
  }

  async function saveEditComment(id) {
    const text = editCommentText.trim();
    if (!text || commentActionPending) return;
    setCommentActionPending(true);
    try {
      await api.put(`/api/posts/${post.id}/comments/${id}`, { text });
      setComments((cs) => cs.map((c) => (c.id === id ? { ...c, text } : c)));
      cancelEditComment();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setCommentActionPending(false);
    }
  }

  async function deleteComment(id) {
    if (commentActionPending || !window.confirm("Delete this comment? This can't be undone.")) return;
    setCommentActionPending(true);
    try {
      await api.delete(`/api/posts/${post.id}/comments/${id}`);
      setComments((cs) => cs.filter((c) => c.id !== id));
      onChanged?.();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setCommentActionPending(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    try {
      await api.delete(`/api/posts/${post.id}`);
      showToast('Post deleted');
      onChanged?.();
      onDeleted?.();
      onClose();
    } catch (err) {
      showToast(err.message, true);
      setDeleting(false);
    }
  }

  const cat = CAT_MAP[post.category] || CAT_MAP.health;
  const isVideo = post.mediaUrl && post.mediaType === 'video';
  const isImage = post.mediaUrl && post.mediaType !== 'video';
  const filter = post.vibe ? pickLookRecipe(post.vibe, post.category).filter : undefined;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={dialogRef} tabIndex={-1} className="modal-box" role="dialog" aria-modal="true" aria-label="Post details">
        <div className="modal-media-pane">
          {isVideo ? (
            <>
              {post.vibe && <span className="vibe-chip">✨ {truncate(post.vibe, 34)}</span>}
              <video src={mediaUrl(post.mediaUrl)} style={filter ? { filter } : undefined} controls autoPlay muted loop playsInline />
            </>
          ) : isImage ? (
            <>
              {!post.aiStyled && post.vibe && (
                <span className="vibe-chip">✨ {truncate(post.vibe, 34)}</span>
              )}
              <img src={mediaUrl(post.mediaUrl)} alt={post.tag ? `Post for #${post.tag}` : 'Post'} style={!post.aiStyled && filter ? { filter } : undefined} />
            </>
          ) : (
            <div className={`text-card ${cat.id}`}><span className="reveal-text">{cat.label}</span></div>
          )}
        </div>
        <div className="modal-detail-pane">
          <div className="modal-detail-head">
            <span onClick={() => onOpenAuthor(post.authorId)} style={{ cursor: 'pointer' }}>
              <Avatar id={post.authorId} name={post.authorName} photoUrl={post.authorPhotoUrl} size={32} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="post-author" style={{ cursor: 'pointer' }} onClick={() => onOpenAuthor(post.authorId)}>{post.authorName}</span>
              <div className="post-meta">
                <span className={`cat-label ${cat.id}`}>{cat.emoji} {cat.label}</span>
                <span className="visibility-label" title={post.visibility === 'public' ? 'Visible to everyone' : 'Visible to accepted followers only'}>
                  {post.visibility === 'public' ? '🌐 Public' : '👥 Friends'}
                </span>
              </div>
            </div>
            {isMe && (
              <div className="post-owner-actions">
                <button type="button" className="goal-remove-btn" onClick={() => setEditing(true)}>Edit</button>
                <button type="button" className="goal-remove-btn" disabled={deleting} onClick={deletePost}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            )}
            <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-detail-scroll">
            {post.tag && (
              <div className="tags-row">
                <span className="tag-chip" onClick={() => onOpenTag(post.tag)}>#{post.tag}</span>
              </div>
            )}
            {post.tag && (
              <PostGoalPanel
                key={`${post.authorId}:${post.tag}:${goalRefreshKey}`}
                post={post}
                isMe={isMe}
                onUploadTask={setPhotoTask}
              />
            )}
            {commentError ? <div className="inline-error" role="alert">Comments couldn’t load. <button type="button" onClick={() => setCommentRetry((n) => n + 1)}>Retry</button></div> : loadingComments ? (
              <div className="about-text">Loading comments…</div>
            ) : comments.length ? (
              <div className="modal-comments">
                {comments.map((c) => (
                  <div key={c.id}>
                    {editingCommentId === c.id ? (
                      <div className="comment-edit-row">
                        <input
                          type="text"
                          className="comment-input"
                          aria-label="Edit comment"
                          value={editCommentText}
                          disabled={commentActionPending}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEditComment(c.id); if (e.key === 'Escape') cancelEditComment(); }}
                        />
                        <button type="button" className="goal-remove-btn" disabled={commentActionPending || !editCommentText.trim()} onClick={() => saveEditComment(c.id)}>Save</button>
                        <button type="button" className="goal-remove-btn" disabled={commentActionPending} onClick={cancelEditComment}>Cancel</button>
                      </div>
                    ) : (
                      <div className="comment-row">
                        <Avatar id={c.authorId} name={c.authorName} size={26} />
                        <div className="comment-bubble"><span className="c-author">{c.authorName}</span>{c.text}</div>
                        {c.authorId === user?.id && (
                          <div className="comment-actions">
                            <button type="button" className="comment-action-btn" onClick={() => startEditComment(c)}>Edit</button>
                            <button type="button" className="comment-action-btn" disabled={commentActionPending} onClick={() => deleteComment(c.id)}>Delete</button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="comment-time">{timeAgo(c.createdAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="about-text">No comments yet — say something.</div>
            )}
          </div>
          <div className="modal-detail-footer">
            <div className="footer-top-row">
              <button className={`action-btn like-btn${liked ? ' liked' : ''}`} disabled={likePending} onClick={toggleLike}>
                <HeartIcon filled={liked} />{likeCount > 0 ? likeCount : 'Like'}
              </button>
              <span className="footer-time">{timeAgo(post.createdAt)}</span>
            </div>
            <div className="comment-form">
              <input
                type="text"
                className="comment-input"
                aria-label="Add a comment"
                disabled={commentPending}
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
              />
              <button className="comment-send-btn" disabled={commentPending || !commentText.trim()} onClick={submitComment}>{commentPending ? 'Sending…' : 'Post'}</button>
            </div>
          </div>
        </div>
      </div>
      {editing && (
        <EditPostModal
          post={post}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged?.();
            onClose();
          }}
        />
      )}
      {photoTask && (
        <ComposerModal
          kind="post"
          initialGoalTask={photoTask}
          onClose={() => setPhotoTask(null)}
          onCreated={() => {
            setGoalRefreshKey((k) => k + 1);
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
