import { Link } from 'react-router-dom';
import { CATEGORIES } from '../lib/format';
import { DoorArt } from '../lib/roomArt';

// The 3-door hub reached after entering the house — replaces the old flat
// 3-zone-strip overview. Each door leads to that category's full-screen
// room (RoomPage, at /profile/:id/room/:category).
export default function HouseHallway({ achievements, authorId }) {
  const countByCategory = {};
  for (const a of achievements) {
    countByCategory[a.category] = (countByCategory[a.category] || 0) + 1;
  }

  return (
    <div className="house-hallway">
      {CATEGORIES.map((c) => (
        <Link key={c.id} to={`/profile/${authorId}/room/${c.id}`} className="house-door">
          <div className="house-door-art" style={{ '--frame-glow': `var(--${c.id})` }}>
            <DoorArt color={`var(--${c.id})`} />
          </div>
          <div className="house-door-label">{c.emoji} {c.label}</div>
          <div className="house-door-count">
            {countByCategory[c.id] || 0} achievement{countByCategory[c.id] === 1 ? '' : 's'}
          </div>
        </Link>
      ))}
    </div>
  );
}
