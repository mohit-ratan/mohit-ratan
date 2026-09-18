import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '../api';
import { CATEGORIES, CAT_MAP, goalStatusLabel } from '../lib/format';
import { VideoIcon } from '../lib/icons';
import { iconForSubtask } from '../lib/subtaskIcons';
import { EmptyRoomShell, Rug, Shelf, PlantPot, Lamp, SideTable } from '../lib/roomArt';

// RoomZone deliberately knows nothing about being 1-of-3 — it's the seam
// for the "house" phase where each zone becomes its own room/route (see
// RoomPage, which renders this same component alone at size="large").
export function RoomZone({ category, achievements, authorId, onOpen, size = 'small' }) {
  const cat = CAT_MAP[category];
  const count = achievements.length;
  const wallVar = `var(--${category}-bg)`;
  const accentVar = `var(--${category})`;

  return (
    <div className={`room-zone room-zone-${size}`}>
      <div className="room-shell-wrap">
        <EmptyRoomShell wallColor={wallVar} floorColor={wallVar} borderColor={accentVar} />
        {count >= 1 && <div className="room-deco room-deco-plant"><PlantPot color={accentVar} /></div>}
        {count >= 3 && <div className="room-deco room-deco-rug"><Rug color={accentVar} /></div>}
        {count >= 3 && <div className="room-deco room-deco-shelf"><Shelf color={accentVar} /></div>}
        {count >= 6 && <div className="room-deco room-deco-lamp"><Lamp color={accentVar} /></div>}
        {count >= 6 && <div className="room-deco room-deco-table"><SideTable color={accentVar} /></div>}
        <div className="room-zone-label" style={{ color: accentVar }}>{cat.emoji} {cat.label}</div>
        {size === 'small' && authorId && (
          <Link className="room-enter-link" to={`/profile/${authorId}/room/${category}`}>Enter room →</Link>
        )}
      </div>

      <div className="room-frames">
        {count === 0 ? (
          <p className="room-empty-caption">No {cat.label.toLowerCase()} achievements yet</p>
        ) : (
          achievements.map((a) => {
            const cover = a.coverPost;
            const isVideo = cover?.mediaType === 'video';
            const status = goalStatusLabel(a.goal);
            const subtasks = a.goal?.subtasks || [];
            return (
              <div key={a.tag} className="achievement-cluster" style={{ '--frame-glow': accentVar }}>
                <button
                  type="button"
                  className="room-item room-frame"
                  onClick={() => onOpen(a)}
                  title={`#${a.tag}`}
                >
                  {isVideo ? (
                    <>
                      <video src={mediaUrl(cover.mediaUrl)} muted preload="metadata" playsInline />
                      <span className="room-frame-badge"><VideoIcon /></span>
                    </>
                  ) : (
                    <img src={mediaUrl(cover.mediaUrl)} alt="" loading="lazy" />
                  )}
                  {status && (
                    <span className={`room-goal-badge room-goal-badge-${status.tone}`}>{status.text}</span>
                  )}
                  <span className="room-caption">#{a.tag} · {a.count}</span>
                </button>
                {subtasks.length > 0 && (
                  <div className="subtask-icons">
                    {subtasks.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`subtask-icon${t.done ? ' subtask-icon-done' : ''}`}
                        title={`${t.text} — ${t.done ? 'Done' : 'Not done yet'}`}
                        onClick={() => onOpen(a)}
                      >
                        {iconForSubtask(t.text)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AchievementsRoom({ achievements, authorId, onOpen }) {
  const byCategory = useMemo(() => {
    const groups = { health: [], wealth: [], relationships: [] };
    for (const a of achievements) {
      (groups[a.category] || groups.health).push(a);
    }
    return groups;
  }, [achievements]);

  return (
    <div className="achievements-room">
      {CATEGORIES.map((c) => (
        <RoomZone key={c.id} category={c.id} achievements={byCategory[c.id]} authorId={authorId} onOpen={onOpen} />
      ))}
    </div>
  );
}
