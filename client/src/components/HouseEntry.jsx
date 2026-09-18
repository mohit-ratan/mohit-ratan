import { mediaUrl } from '../api';
import { CATEGORIES, goalStats } from '../lib/format';
import { HouseFacade } from '../lib/roomArt';

// The first thing you see on the Achievements Room page — a house exterior
// you click into, leading to HouseHallway (the 3-door hub). Shows a peek
// of what's inside: recent achievement photos in the windows, plus a
// one-line summary and aggregate goal status across the whole house.
export default function HouseEntry({ displayName, achievements, onEnter }) {
  const previews = [...achievements]
    .sort((a, b) => (b.coverPost?.createdAt || 0) - (a.coverPost?.createdAt || 0))
    .slice(0, 2);

  const stats = goalStats(achievements);
  const summary = stats.total === 0
    ? 'Nothing inside yet — post something to start filling it up.'
    : `${stats.total} achievement${stats.total === 1 ? '' : 's'} waiting inside.`;

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
      {(stats.trophies > 0 || stats.active > 0) && (
        <div className="house-door-goal-stats">
          {stats.trophies > 0 && <span className="house-door-stat house-door-stat-done">🏆 {stats.trophies} earned</span>}
          {stats.active > 0 && <span className="house-door-stat house-door-stat-active">🎯 {stats.active} in progress</span>}
        </div>
      )}
      {stats.total > 0 && (
        <div className="house-door-popover">
          <ul className="house-door-popover-list">
            {CATEGORIES.map((c) => {
              const catStats = goalStats(achievements.filter((a) => a.category === c.id));
              if (catStats.total === 0) return null;
              return (
                <li key={c.id}>
                  {c.emoji} {c.label}: {catStats.total} · 🏆 {catStats.trophies} · 🎯 {catStats.active}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </button>
  );
}
