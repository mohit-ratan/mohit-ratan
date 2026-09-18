import { useEffect, useState } from 'react';
import api, { mediaUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CAT_MAP, timeAgo, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import Avatar from './Avatar';
import EditPostModal from './EditPostModal';
import PostGoalPanel from './PostGoalPanel';
import { HeartIcon, SparkleIcon } from '../lib/icons';

export default function PostDetailModal({ post, onClose, onChanged, onDeleted, onOpenAuthor, onOpenTag }) {
  const { user } = useAuth();
  const showToast = useToast();
  const isMe = user?.id === post.authorId;
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/posts/${post.id}/comments`).then(({ data }) => {
      if (!cancelled) setComments(data.comments);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
  }, [post.id]);

  async function toggleLike() {
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
    }
  }

  async function submitComment() {
    const text = commentText.trim();
    if (!text) return;
    try {
      const { data } = await api.post(`/api/posts/${post.id}/comments`, { text });
      setComments((cs) => [...cs, { id: data.id, authorId: user.id, authorName: user.displayName, text, createdAt: Date.now() }]);
      setCommentText('');
      onChanged?.();
    } catch (err) {
      showToast(err.message, true);
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
      <div className="modal-box">
        <div className="modal-media-pane">
          {isVideo ? (
            <>
              {post.vibe && <span className="vibe-chip">✨ {truncate(post.vibe, 34)}</span>}
              <video src={mediaUrl(post.mediaUrl)} style={filter ? { filter } : undefined} controls autoPlay muted loop playsInline />
            </>
          ) : isImage ? (
            <>
              {post.aiStyled ? (
                <span className="styled-badge"><SparkleIcon />AI look — {truncate(post.vibe || '', 24)}</span>
              ) : post.vibe ? (
                <span className="vibe-chip">✨ {truncate(post.vibe, 34)}</span>
              ) : null}
              <img src={mediaUrl(post.mediaUrl)} alt="Post" />
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
              <div className="post-meta"><span className={`cat-label ${cat.id}`}>{cat.emoji} {cat.label}</span></div>
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
            {post.tag && <PostGoalPanel key={`${post.authorId}:${post.tag}`} post={post} />}
            {loadingComments ? (
              <div className="about-text">Loading comments…</div>
            ) : comments.length ? (
              <div className="modal-comments">
                {comments.map((c) => (
                  <div key={c.id}>
                    <div className="comment-row">
                      <Avatar id={c.authorId} name={c.authorName} size={26} />
                      <div className="comment-bubble"><span className="c-author">{c.authorName}</span>{c.text}</div>
                    </div>
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
              <button className={`action-btn like-btn${liked ? ' liked' : ''}`} onClick={toggleLike}>
                <HeartIcon filled={liked} />{likeCount > 0 ? likeCount : 'Like'}
              </button>
              <span className="footer-time">{timeAgo(post.createdAt)}</span>
            </div>
            <div className="comment-form">
              <input
                type="text"
                className="comment-input"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
              />
              <button className="comment-send-btn" onClick={submitComment}>Post</button>
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
    </div>
  );
}
