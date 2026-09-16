import { useEffect, useRef } from 'react';
import api, { mediaUrl } from '../api';
import { timeAgo, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import Avatar from './Avatar';

const STORY_MS = 5000;

// `groups` is the same author-grouped story list StoriesBar builds;
// `authorId`/`index` select which story is currently showing.
export default function StoryViewerModal({ groups, authorId, index, onAdvance, onClose }) {
  const timerRef = useRef(null);
  const group = groups.find((g) => g.authorId === authorId);
  const story = group?.stories[index];

  useEffect(() => {
    if (!story) return;
    api.post(`/api/stories/${story.id}/view`).catch(() => {});
  }, [story?.id]);

  useEffect(() => {
    if (!story) return;
    if (story.mediaType === 'video') return; // advances on video 'ended' instead
    timerRef.current = setTimeout(() => onAdvance(1), STORY_MS);
    return () => clearTimeout(timerRef.current);
  }, [story?.id]);

  if (!group || !story) return null;

  const isVideo = story.mediaUrl && story.mediaType === 'video';
  const filter = story.vibe ? pickLookRecipe(story.vibe, story.category).filter : undefined;

  return (
    <div className="modal-backdrop story-viewer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="story-viewer-box">
        <div className="story-progress-row">
          {group.stories.map((s, i) => (
            <div key={s.id} className={`story-progress-seg ${i < index ? 'done' : i === index ? 'active' : ''}`}>
              <span
                className="story-progress-fill"
                style={i === index && !isVideo ? { animationDuration: `${STORY_MS}ms` } : undefined}
              />
            </div>
          ))}
        </div>
        <div className="story-viewer-head">
          <Avatar id={story.authorId} name={story.authorName} photoUrl={story.authorPhotoUrl} size={30} />
          <span className="name">{story.authorName}</span>
          <span className="time">{timeAgo(story.createdAt)}</span>
          <button className="story-viewer-close" type="button" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="story-viewer-media">
          <div className="story-tap-zone prev" onClick={() => onAdvance(-1)} />
          <div className="story-tap-zone next" onClick={() => onAdvance(1)} />
          {isVideo ? (
            <video
              src={mediaUrl(story.mediaUrl)}
              style={filter ? { filter } : undefined}
              autoPlay
              playsInline
              muted
              onEnded={() => onAdvance(1)}
            />
          ) : story.mediaUrl ? (
            <img src={mediaUrl(story.mediaUrl)} alt="Story" />
          ) : (
            <div className="text-card default"><span className="reveal-text">{story.tag ? `#${story.tag}` : story.vibe}</span></div>
          )}
          {story.vibe && story.mediaUrl && (
            <span className="vibe-chip story-viewer-vibe">✨ {truncate(story.vibe, 30)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
