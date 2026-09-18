import { useEffect, useRef, useState } from 'react';
import api, { mediaUrl } from '../api';
import { timeAgo, truncate } from '../lib/format';
import { pickLookRecipe } from '../lib/looks';
import Avatar from './Avatar';

const STORY_MS = 5000;

// `groups` is the same author-grouped story list StoriesBar builds;
// `authorId`/`index` select which story is currently showing.
export default function StoryViewerModal({ groups, authorId, index, onAdvance, onClose }) {
  const [loaded, setLoaded] = useState(null);
  const [failed, setFailed] = useState(null);
  const [retry, setRetry] = useState(0);
  const advanceRef = useRef(onAdvance);
  useEffect(() => { advanceRef.current = onAdvance; }, [onAdvance]);
  const group = groups.find((g) => g.authorId === authorId);
  const story = group?.stories[index];

  const storyId = story?.id;
  const isVideo = story?.mediaType === 'video';
  const loadKey = `${storyId}:${retry}`;
  const ready = !!story && (!story.mediaUrl || loaded === loadKey);
  const error = failed === loadKey;

  useEffect(() => {
    if (!storyId || !ready || error) return;
    api.post(`/api/stories/${storyId}/view`).catch(() => {});
  }, [storyId, ready, error]);

  useEffect(() => {
    if (!ready || error || isVideo) return;
    const timer = setTimeout(() => advanceRef.current(1), STORY_MS);
    return () => clearTimeout(timer);
  }, [loadKey, ready, error, isVideo]);

  const nextStory = group?.stories[index + 1] || groups[groups.indexOf(group) + 1]?.stories[0];
  const nextImage = nextStory?.mediaType === 'image' ? nextStory.mediaUrl : null;
  useEffect(() => {
    if (!nextImage || !ready) return;
    const image = new Image();
    image.src = mediaUrl(nextImage);
  }, [nextImage, ready]);

  if (!group || !story) return null;

  const filter = story.vibe ? pickLookRecipe(story.vibe, story.category).filter : undefined;

  return (
    <div className="modal-backdrop story-viewer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="story-viewer-box">
        <div className="story-progress-row">
          {group.stories.map((s, i) => (
            <div key={`${s.id}:${retry}`} className={`story-progress-seg ${i < index ? 'done' : i === index && ready && !error ? 'active' : ''}`}>
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
              key={loadKey}
              src={mediaUrl(story.mediaUrl)}
              onLoadedData={() => setLoaded(loadKey)}
              onError={() => setFailed(loadKey)}
              style={filter ? { filter } : undefined}
              autoPlay
              playsInline
              muted
              onEnded={() => onAdvance(1)}
            />
          ) : story.mediaUrl ? (
            <img key={loadKey} src={mediaUrl(story.mediaUrl)} alt="Story" fetchPriority="high" onLoad={() => setLoaded(loadKey)} onError={() => setFailed(loadKey)} style={!story.aiStyled && filter ? { filter } : undefined} />
          ) : (
            <div className="text-card default"><span className="reveal-text">{story.tag ? `#${story.tag}` : story.vibe}</span></div>
          )}
          {!ready && !error && <div className="story-load-state" role="status">Loading status…</div>}
          {error && <div className="story-load-state" role="alert"><p>Couldn’t load this status.</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
          {story.vibe && story.mediaUrl && (
            <span className="vibe-chip story-viewer-vibe">✨ {truncate(story.vibe, 30)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
