import FireAwardIcon from './FireAwardIcon';
import { Link } from 'react-router-dom';
import { CAT_MAP } from '../lib/format';

// Goal trophies and per-goal streak runs share the profile award collection.
// One trophy per fully-completed goal (every subtask checked) — shown only
// when there's at least one, so a profile with none stays uncluttered. The
// Trifecta Award is a separate, rarer thing: earned once a member has a
// completed goal in all three categories at once (src/lib/trifecta.js on
// the backend), so it gets its own holographic badge up front.
export default function TrophyCase({ trophies, authorId, trifecta, streakAwards = [] }) {
  const total = trophies.length + streakAwards.length + (trifecta?.earned ? 1 : 0);
  if (!total) return null;

  return (
    <div className="card trophy-case">
      <div className="trophy-case-title">🏆 Trophy Case · {total}</div>
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
        {streakAwards.map(award => {
          const cat = CAT_MAP[award.category] || CAT_MAP.health;
          return <Link
            key={`streak:${award.tag}:${award.id}`}
            to={`/profile/${authorId}/achievements?category=${cat.id}#earned-streak-awards`}
            className="trophy-badge trophy-badge-streak"
            title={`${award.days}-day ${cat.label} streak · #${award.tag}${award.active ? ' · Still growing' : ' · Completed run'}`}
          >
            <FireAwardIcon days={award.days} />
            <span className="trophy-badge-streak-days">{award.days}-day streak</span>
            <span className="trophy-badge-tag">#{award.tag}</span>
          </Link>;
        })}
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
