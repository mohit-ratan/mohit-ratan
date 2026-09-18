import { Link } from 'react-router-dom';
import { CAT_MAP } from '../lib/format';

// One trophy per fully-completed goal (every subtask checked) — shown only
// when there's at least one, so a profile with none stays uncluttered.
export default function TrophyCase({ trophies, authorId }) {
  if (!trophies.length) return null;

  return (
    <div className="card trophy-case">
      <div className="trophy-case-title">🏆 Trophy Case · {trophies.length}</div>
      <div className="trophy-grid">
        {trophies.map((a) => {
          const cat = CAT_MAP[a.category] || CAT_MAP.health;
          return (
            <Link
              key={a.tag}
              to={`/profile/${authorId}/room/${a.category}`}
              className="trophy-badge"
              style={{ '--frame-glow': `var(--${a.category})` }}
              title={`#${a.tag} — ${cat.label}`}
            >
              <span className="trophy-badge-icon">🏆</span>
              <span className="trophy-badge-tag">#{a.tag}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
