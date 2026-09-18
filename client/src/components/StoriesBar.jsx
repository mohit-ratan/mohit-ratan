import { useMemo } from 'react';
import { mediaUrl } from '../api';
import Avatar from './Avatar';
import { truncate } from '../lib/format';
import { useAuth } from '../context/AuthContext';

function groupByAuthor(stories) {
  const groups = {};
  const order = [];
  stories.forEach((s) => {
    if (!groups[s.authorId]) {
      groups[s.authorId] = { authorId: s.authorId, authorName: s.authorName, authorPhotoUrl: s.authorPhotoUrl, stories: [], hasUnseen: false };
      order.push(s.authorId);
    }
    groups[s.authorId].stories.push(s);
    if (!s.viewedByMe) groups[s.authorId].hasUnseen = true;
  });
  return order.map((id) => groups[id]);
}

function preloadFirst(group) {
  const story = group?.stories.find((item) => !item.viewedByMe) || group?.stories[0];
  if (story?.mediaType === 'image') {
    const image = new Image();
    image.src = mediaUrl(story.mediaUrl);
  }
}

export default function StoriesBar({ stories, onOpenAuthor, onAddStory }) {
  const { user } = useAuth();
  const groups = useMemo(() => groupByAuthor(stories || []), [stories]);
  const mine = groups.find((g) => g.authorId === user?.id);
  const others = groups.filter((g) => g.authorId !== user?.id);

  return (
    <div className="stories-bar">
      <div className="story-item">
        <div
          className={`story-ring ${mine ? 'has-story' : 'no-story'}`}
          onPointerEnter={() => preloadFirst(mine)}
          onTouchStart={() => preloadFirst(mine)}
          onClick={() => (mine ? onOpenAuthor(user.id) : onAddStory())}
        >
          <div className="story-ring-inner">
            <Avatar id={user?.id} name={user?.displayName || 'you'} photoUrl={user?.photoUrl} size={54} />
          </div>
        </div>
        <button type="button" className="story-plus" aria-label="Add to your story" onClick={(e) => { e.stopPropagation(); onAddStory(); }}>+</button>
        <span className="story-label">Your story</span>
      </div>
      {others.map((g) => (
        <div key={g.authorId} className="story-item" onPointerEnter={() => preloadFirst(g)} onTouchStart={() => preloadFirst(g)} onClick={() => onOpenAuthor(g.authorId)}>
          <div className={`story-ring ${g.hasUnseen ? 'unseen' : 'seen'}`}>
            <div className="story-ring-inner">
              <Avatar id={g.authorId} name={g.authorName} photoUrl={g.authorPhotoUrl} size={54} />
            </div>
          </div>
          <span className="story-label">{truncate(g.authorName, 10)}</span>
        </div>
      ))}
    </div>
  );
}
