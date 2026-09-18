import { mediaUrl } from '../api';
import { CAT_MAP, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import { HeartIcon, CommentIcon, VideoIcon, SparkleIcon } from '../lib/icons';
import Avatar from './Avatar';

function postWord(p) {
  return p.tag ? `#${p.tag}` : '';
}

function GridTile({ post, onOpen, onOpenAuthor, showAuthor }) {
  const cat = CAT_MAP[post.category] || CAT_MAP.health;
  const isVideo = post.mediaUrl && post.mediaType === 'video';
  const isImage = post.mediaUrl && post.mediaType !== 'video';
  const filter = post.vibe ? pickLookRecipe(post.vibe, post.category).filter : undefined;
  const badgeHtml = isImage && post.aiStyled;
  const vibeHtml = post.vibe && !badgeHtml;
  const captionSource = post.mediaUrl ? (postWord(post) || post.vibe) : '';

  return (
    <div className="grid-tile">
      <button type="button" className="tile-open" aria-label={`Open ${post.authorName || 'user'}’s ${post.tag ? `#${post.tag}` : cat.label} post`} onClick={() => onOpen(post)}>
        {!showAuthor && <span className="tile-cat-dot" style={{ background: `var(--${cat.id})` }} title={cat.label} />}
        {isVideo ? (
          <>
            <video src={mediaUrl(post.mediaUrl)} style={filter ? { filter } : undefined} muted playsInline preload="metadata" />
            <span className="tile-badge"><VideoIcon /></span>
          </>
        ) : isImage ? (
          <img src={mediaUrl(post.mediaUrl)} alt="" loading="lazy" decoding="async" style={!post.aiStyled && filter ? { filter } : undefined} />
        ) : (
          <div className={`text-card ${cat.id}`}>
            <span className="reveal-text">{truncate(postWord(post) || cat.label, 90)}</span>
          </div>
        )}
        {badgeHtml && <span className="styled-badge"><SparkleIcon />Filtered</span>}
        {vibeHtml && <span className="vibe-chip">✨ {truncate(post.vibe, 26)}</span>}
        {captionSource && (
          <div className="tile-caption"><span className="reveal-text">{truncate(captionSource, 54)}</span></div>
        )}
        <div className="tile-overlay">
          <span><HeartIcon filled />{post.likeCount || 0}</span>
          <span><CommentIcon />{post.commentCount || 0}</span>
        </div>
      </button>
      {showAuthor && (
        <button type="button" className="tile-author" onClick={(e) => { e.stopPropagation(); onOpenAuthor?.(post.authorId); }}>
          <span className="tile-author-avatar" style={{ borderColor: `var(--${cat.id})` }}>
            <Avatar id={post.authorId} name={post.authorName} photoUrl={post.authorPhotoUrl} size={22} />
          </span>
          <span className="tile-author-name">{truncate(post.authorName || 'Someone', 16)}</span>
        </button>
      )}
    </div>
  );
}

export default function PostGrid({ posts, onOpen, onOpenAuthor, showAuthor, emptyIcon, emptyTitle, emptyText }) {
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
    <div className="grid">
      {posts.map((p) => <GridTile key={p.id} post={p} onOpen={onOpen} onOpenAuthor={onOpenAuthor} showAuthor={showAuthor} />)}
    </div>
  );
}
