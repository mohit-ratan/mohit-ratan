import PostLikesModal from './PostLikesModal';
import FeedVideo from './FeedVideo';
import PostProgressBar from './PostProgressBar';
import { CategoryIcon, ThemeIcon } from '../lib/icons';
import { useEffect, useRef, useState } from 'react';
import api, { mediaUrl } from '../api';
import { CAT_MAP, timeAgo, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import { HeartIcon, CommentIcon } from '../lib/icons';
import CheerPicker from './CheerPicker';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

const ASPECT_RATIOS = { square: '1 / 1', portrait: '4 / 5', landscape: '16 / 9' };

function FeedCard({ post, onOpen, onOpenAuthor, onOpenTag }) {
  const { user } = useAuth();
  const [peopleList, setPeopleList] = useState(null);
  const cat = CAT_MAP[post.category] || CAT_MAP.health;
  const isVideo = post.mediaUrl && post.mediaType === 'video';
  const isImage = post.mediaUrl && post.mediaType !== 'video';
  const filter = post.vibe ? pickLookRecipe(post.vibe, post.category).filter : undefined;
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const showFilledHeart = liked || (user?.id === post.authorId && likeCount > 0);
  const [likePending, setLikePending] = useState(false);
  const [cheerUpdate, setCheerUpdate] = useState(null);
  const cheers = cheerUpdate && cheerUpdate.source === post.cheers ? cheerUpdate.items : (post.cheers || []);
  const cheerCount = cheers.reduce((total, item) => total + item.count, 0);
  const [myReaction, setMyReaction] = useState(post.myReaction || null);
  const [reactionPending, setReactionPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false);
    }
    const escape = e => { if (e.key === 'Escape') { setPickerOpen(false); pickerRef.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', escape); };
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
      if (data.cheers) setCheerUpdate({ source: post.cheers, items: data.cheers });
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
            <span className={`cat-label ${cat.id}`} role="img" aria-label={cat.label} title={cat.label}><CategoryIcon category={cat.id} /></span>
            <span>· {timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </header>
      {isVideo ? <FeedVideo post={post} filter={filter} onOpen={() => onOpen(post)} /> : <button type="button" className="feed-card-media" style={{ aspectRatio: ASPECT_RATIOS[post.aspectRatio] || ASPECT_RATIOS.square }} aria-label={`Open ${post.tag ? `#${post.tag}` : cat.label} post`} onClick={() => onOpen(post)}>
        {isImage ? (
          <img src={mediaUrl(post.mediaUrl)} alt={post.tag ? `Post for #${post.tag}` : 'Post'} loading="lazy" decoding="async" style={{ objectPosition: `${post.cropX ?? 50}% ${post.cropY ?? 50}%`, ...(!post.aiStyled && filter ? { filter } : null) }} />
        ) : (
          <div className={`text-card ${cat.id}`}><span className="reveal-text">{cat.label}</span></div>
        )}
        {isImage && post.vibe && !post.aiStyled && <span className="vibe-chip"><ThemeIcon name="sparkle" /> {truncate(post.vibe, 34)}</span>}
      </button>}
      <div className="feed-card-actions">
        <button type="button" className={`action-btn like-btn${showFilledHeart ? ' liked' : ''}`} aria-pressed={liked} aria-label={liked ? 'Unlike post' : 'Like post'} disabled={likePending} onClick={toggleLike}>
          <HeartIcon filled={showFilledHeart} />{likeCount ? '' : 'Like'}
        </button>
        {likeCount > 0 && <button type="button" className="engagement-count" aria-label={`See ${likeCount} people who liked this post`} onClick={() => setPeopleList({ kind: 'likes' })}>{likeCount}</button>}
        <button type="button" className="action-btn" aria-label="Comment on this post" onClick={() => onOpen(post)}>
          <CommentIcon />{post.commentCount > 0 ? '' : 'Comment'}
        </button>
        {post.commentCount > 0 && <button type="button" className="engagement-count" aria-label={`See people who left ${post.commentCount} comments`} onClick={() => setPeopleList({ kind: 'comments' })}>{post.commentCount}</button>}
        <div className="feed-reaction-trigger-wrap" ref={pickerRef}>
          <button
            type="button"
            className={`action-btn feed-reaction-button${myReaction ? ' reacted' : ''}`}
            disabled={reactionPending}
            aria-label={myReaction ? 'Change your cheer' : 'Send a cheer'}
            aria-expanded={pickerOpen}
            onClick={(e) => { e.stopPropagation(); setPickerOpen((v) => !v); }}
          >
            <ThemeIcon name="cheer" />
            {cheerCount ? '' : 'Cheer'}
          </button>
          {pickerOpen && <CheerPicker onPick={pickReaction} current={myReaction} onRemove={() => pickReaction(myReaction)} />}
        </div>
        {cheerCount > 0 && <button type="button" className="engagement-count" aria-label={`See ${cheerCount} people who cheered this post`} onClick={() => setPeopleList({ kind: 'cheers' })}>{cheerCount}</button>}
      </div>
      {post.goalProgress?.target > 0 && (
        <button type="button" className={`feed-card-progress house-floor-${post.category}`} onClick={() => onOpen(post)}>
          <span><ThemeIcon name="target" /> {post.goalProgress.completed}/{post.goalProgress.target} task days</span>
          <PostProgressBar streak={post.goalProgress.streak} category={post.category} completed={post.goalProgress.completed} target={post.goalProgress.target} />
        </button>
      )}
      {post.tag && (
        <div className="tags-row feed-card-tags">
          <span className="tag-chip" onClick={() => onOpenTag(post.tag)}>#{post.tag}</span>
        </div>
      )}
      {peopleList && <PostLikesModal postId={post.id} kind={peopleList.kind} reaction={peopleList.reaction} onClose={() => setPeopleList(null)} onOpenAuthor={onOpenAuthor} />}
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
