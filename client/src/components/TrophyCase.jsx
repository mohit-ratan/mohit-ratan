import { Link } from 'react-router-dom';
import { CAT_MAP } from '../lib/format';

// One trophy per fully-completed goal (every subtask checked) — shown only
// when there's at least one, so a profile with none stays uncluttered. The
// Trifecta Award is a separate, rarer thing: earned once a member has a
// completed goal in all three categories at once (src/lib/trifecta.js on
// the backend), so it gets its own holographic badge up front.
export default function TrophyCase({ trophies, authorId, trifecta }) {
  if (!trophies.length) return null;

  return (
    <div className="card trophy-case">
      <div className="trophy-case-title">🏆 Trophy Case · {trophies.length}</div>
      <div className="trophy-grid">
        {trifecta?.earned && (
          <Link
            to={`/profile/${authorId}/achievements`}
            className="trophy-badge trophy-badge-trifecta"
            title="Trifecta Award — a completed goal in every category"
          >
            <span className="trophy-badge-trifecta-medallion" aria-hidden="true">
              <span className="trophy-badge-trifecta-holo" />
              <span>🏆</span>
            </span>
            <span className="trophy-badge-tag">Trifecta</span>
          </Link>
        )}
        {trophies.map((a) => {
          const cat = CAT_MAP[a.category] || CAT_MAP.health;
          return (
            <Link
              key={a.tag}
              to={`/profile/${authorId}/achievements?floor=${a.category}`}
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
