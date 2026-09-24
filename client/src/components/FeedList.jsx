import { useEffect, useRef, useState } from 'react';
import api, { mediaUrl } from '../api';
import { CAT_MAP, timeAgo, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import { HeartIcon, CommentIcon, VideoIcon } from '../lib/icons';
import { isMemeReaction, memeReaction } from '../lib/reactions';
import ReactionPickerPanel from './ReactionPickerPanel';
import Avatar from './Avatar';

const ASPECT_RATIOS = { square: '1 / 1', portrait: '4 / 5', landscape: '16 / 9' };

function FeedCard({ post, onOpen, onOpenAuthor, onOpenTag }) {
  const cat = CAT_MAP[post.category] || CAT_MAP.health;
  const isVideo = post.mediaUrl && post.mediaType === 'video';
  const isImage = post.mediaUrl && post.mediaType !== 'video';
  const filter = post.vibe ? pickLookRecipe(post.vibe, post.category).filter : undefined;
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [likePending, setLikePending] = useState(false);
  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [reactionPending, setReactionPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  async function toggleLike(e) {
    e.stopPropagation();
    if (likePending) return;
    setLikePending(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      await api.post(`/api/posts/${post.id}/like`);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLikePending(false);
    }
  }

  async function pickReaction(key) {
    setPickerOpen(false);
    if (reactionPending) return;
    setReactionPending(true);
    const before = myReaction;
    setMyReaction(key === before ? null : key);
    try {
      const { data } = await api.post(`/api/posts/${post.id}/reaction`, { reaction: key });
      setMyReaction(data.myReaction);
    } catch {
      setMyReaction(before);
    } finally {
      setReactionPending(false);
    }
  }

  return (
    <article className="card feed-card">
      <header className="feed-card-head">
        <span onClick={() => onOpenAuthor(post.authorId)} style={{ cursor: 'pointer' }}>
          <Avatar id={post.authorId} name={post.authorName} photoUrl={post.authorPhotoUrl} size={38} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="post-author" onClick={() => onOpenAuthor(post.authorId)}>{post.authorName}</span>
          <div className="post-meta">
            <span className={`cat-label ${cat.id}`}>{cat.emoji} {cat.label}</span>
            <span>· {timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </header>
      <button type="button" className="feed-card-media" style={{ aspectRatio: ASPECT_RATIOS[post.aspectRatio] || ASPECT_RATIOS.square }} aria-label={`Open ${post.tag ? `#${post.tag}` : cat.label} post`} onClick={() => onOpen(post)}>
        {isVideo ? (
          <video src={mediaUrl(post.mediaUrl)} style={filter ? { filter } : undefined} muted playsInline preload="metadata" />
        ) : isImage ? (
          <img src={mediaUrl(post.mediaUrl)} alt={post.tag ? `Post for #${post.tag}` : 'Post'} loading="lazy" decoding="async" style={{ objectPosition: `${post.cropX ?? 50}% ${post.cropY ?? 50}%`, ...(!post.aiStyled && filter ? { filter } : null) }} />
        ) : (
          <div className={`text-card ${cat.id}`}><span className="reveal-text">{cat.label}</span></div>
        )}
        {isVideo && <span className="tile-badge"><VideoIcon /></span>}
        {isImage && post.vibe && !post.aiStyled && <span className="vibe-chip">✨ {truncate(post.vibe, 34)}</span>}
      </button>
      <div className="feed-card-actions">
        <button type="button" className={`action-btn like-btn${liked ? ' liked' : ''}`} disabled={likePending} onClick={toggleLike}>
          <HeartIcon filled={liked} />{likeCount > 0 ? likeCount : 'Like'}
        </button>
        <button type="button" className="action-btn" onClick={() => onOpen(post)}>
          <CommentIcon />{post.commentCount > 0 ? post.commentCount : 'Comment'}
        </button>
        <div className="feed-reaction-trigger-wrap" ref={pickerRef}>
          <button
            type="button"
            className={`action-btn${myReaction ? ' feed-sticker-badge' : ''}`}
            disabled={reactionPending}
            aria-label={myReaction ? 'Change your reaction' : 'Add a reaction'}
            onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
          >
            {myReaction ? (
              isMemeReaction(myReaction) ? (
                <span className="comment-sticker-meme" style={{ background: memeReaction(myReaction).bg }}>
                  <span>{memeReaction(myReaction).emoji}</span><small>{memeReaction(myReaction).label}</small>
                </span>
              ) : (
                <span className="comment-sticker-emoji">{myReaction}</span>
              )
            ) : '😊+'}
          </button>
          {pickerOpen && <ReactionPickerPanel onPick={pickReaction} />}
        </div>
      </div>
      {post.goalProgress?.target > 0 && (
        <button type="button" className={`feed-card-progress house-floor-${post.category}`} onClick={() => onOpen(post)}>
          <span>🎯 {post.goalProgress.completed}/{post.goalProgress.target} task days</span>
          <progress value={post.goalProgress.completed} max={post.goalProgress.target} aria-label="Goal progress" />
        </button>
      )}
      {post.tag && (
        <div className="tags-row feed-card-tags">
          <span className="tag-chip" onClick={() => onOpenTag(post.tag)}>#{post.tag}</span>
        </div>
      )}
    </article>
  );
}

export default function FeedList({ posts, onOpen, onOpenAuthor, onOpenTag, emptyIcon, emptyTitle, emptyText }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="card empty-state">
        <div className="emoji">{emptyIcon}</div>
        <h3>{emptyTitle}</h3>
        <p>{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="feed-list">
      {posts.map((p) => <FeedCard key={p.id} post={p} onOpen={onOpen} onOpenAuthor={onOpenAuthor} onOpenTag={onOpenTag} />)}
    </div>
  );
}
