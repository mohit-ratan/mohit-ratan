import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import { CAT_MAP } from '../lib/format';

// Ranks everyone I follow by how close their single best active goal is to
// finishing. There's no stored order — it's recomputed live from real
// progress every time this loads, so who's on top naturally shifts as
// people actually make (or don't make) progress, rather than sitting in a
// fixed list.
export default function FollowingProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [streak, setStreak] = useState(0);
  const [people, setPeople] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api.get('/api/follows/progress')
      .then(({ data }) => setPeople(data.people))
      .catch((err) => { setError(err.message); showToast(err.message, true); });
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.get(`/api/profile/${user.id}`)
      .then(({ data }) => { if (!cancelled) setStreak(data.streak); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  return (
    <>
      <Header streak={streak} counts={{}} />
      <div className="wrap">
        <main className="layout">
          <section className="feed-col">
            <div className="feed-intro">
              <div>
                <span className="house-eyebrow">RANKED BY REAL PROGRESS</span>
                <h1>Who's closest to their goal?</h1>
                <p>Everyone you follow, ranked by their nearest goal to finishing. This reshuffles as people actually make progress — it isn't a fixed order.</p>
              </div>
            </div>
            {error && (
              <div className="card empty-state" role="alert">
                <p>{error}</p>
                <button type="button" className="house-enter-btn" onClick={load}>Try again</button>
              </div>
            )}
            {!error && people === null && <div className="card empty-state"><p>Loading…</p></div>}
            {!error && people?.length === 0 && (
              <div className="card empty-state">
                <div className="emoji">🎯</div>
                <h3>Nothing to rank yet</h3>
                <p>Once people you follow set a goal and start logging progress, they'll show up here.</p>
              </div>
            )}
            {!error && people?.length > 0 && (
              <ol className="progress-rank-list">
                {people.map((p, index) => {
                  const cat = CAT_MAP[p.goal.category] || CAT_MAP.health;
                  return (
                    <li key={p.id} className={`progress-rank-row${p.isMe ? ' is-me' : ''}`}>
                      <span className="progress-rank-position">#{index + 1}</span>
                      <button type="button" className="progress-rank-person" onClick={() => navigate(`/profile/${p.id}`)}>
                        <Avatar id={p.id} name={p.displayName} photoUrl={p.photoUrl} size={44} />
                      </button>
                      <div className="progress-rank-details">
                        <button type="button" className="progress-rank-name" onClick={() => navigate(`/profile/${p.id}`)}>{p.displayName}{p.isMe ? ' (you)' : ''}</button>
                        <span className={`cat-label ${cat.id}`}>{cat.emoji} {cat.label} · #{p.goal.tag}</span>
                        <div className="goal-task-summary"><span>{p.goal.completedDays} / {p.goal.targetDays} task days</span><strong>{p.goal.percent}%</strong></div>
                        <progress value={p.goal.percent} max={100} aria-label={`${p.displayName}: ${p.goal.percent}% toward #${p.goal.tag}`} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
