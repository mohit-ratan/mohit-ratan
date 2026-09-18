import { mediaUrl } from '../api';
import { HouseFacade } from '../lib/roomArt';

// The first thing you see on the Achievements Room page — a house exterior
// you click into, leading to HouseHallway (the 3-door hub). Shows a peek
// of what's inside: recent achievement photos in the windows, plus a
// one-line summary.
export default function HouseEntry({ displayName, achievements, onEnter }) {
  const previews = [...achievements]
    .sort((a, b) => (b.coverPost?.createdAt || 0) - (a.coverPost?.createdAt || 0))
    .slice(0, 2);

  const total = achievements.length;
  const summary = total === 0
    ? 'Nothing inside yet — post something to start filling it up.'
    : `${total} achievement${total === 1 ? '' : 's'} waiting inside.`;

  return (
    <button type="button" className="house-entry" onClick={onEnter}>
      <div className="house-entry-art">
        <HouseFacade wallColor="var(--surface-2)" roofColor="var(--text-muted)" doorColor="var(--accent)" />
        {previews.map((a, i) => {
          const cover = a.coverPost;
          const isVideo = cover?.mediaType === 'video';
          return (
            <div key={a.tag} className={`house-window-preview house-window-preview-${i}`}>
              {isVideo ? (
                <video src={mediaUrl(cover.mediaUrl)} muted preload="metadata" playsInline />
              ) : (
                <img src={mediaUrl(cover.mediaUrl)} alt="" loading="lazy" />
              )}
            </div>
          );
        })}
      </div>
      <div className="house-entry-label">🚪 Enter {displayName}’s house</div>
      <div className="house-entry-summary">{summary}</div>
    </button>
  );
}
