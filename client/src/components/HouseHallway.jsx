import { Link } from 'react-router-dom';
import { CATEGORIES, goalStats } from '../lib/format';
import { DoorArt } from '../lib/roomArt';

// The 3-door hub reached after entering the house — replaces the old flat
// 3-zone-strip overview. Each door leads to that category's full-screen
// room (RoomPage, at /profile/:id/room/:category).
export default function HouseHallway({ achievements, authorId }) {
  return (
    <div className="house-hallway">
      {CATEGORIES.map((c) => {
        const inCat = achievements.filter((a) => a.category === c.id);
        const stats = goalStats(inCat);
        return (
          <Link key={c.id} to={`/profile/${authorId}/room/${c.id}`} className="house-door">
            <div className="house-door-art" style={{ '--frame-glow': `var(--${c.id})` }}>
              <DoorArt color={`var(--${c.id})`} />
            </div>
            <div className="house-door-label">{c.emoji} {c.label}</div>
            <div className="house-door-count">
              {stats.total} achievement{stats.total === 1 ? '' : 's'}
            </div>
            {(stats.trophies > 0 || stats.active > 0) && (
              <div className="house-door-goal-stats">
                {stats.trophies > 0 && <span className="house-door-stat house-door-stat-done">🏆 {stats.trophies}</span>}
                {stats.active > 0 && <span className="house-door-stat house-door-stat-active">🎯 {stats.active}</span>}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
