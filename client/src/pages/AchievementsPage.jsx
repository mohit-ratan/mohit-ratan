import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
const AchievementRoom = lazy(() => import('../three/AchievementRoom')); 
import RoomBoundary from '../components/RoomBoundary';
import Crosshair from '../three/Crosshair';
import AchievementDetailModal from '../components/AchievementDetailModal';
import GoalOverview from '../components/GoalOverview';
import ComposerModal from '../components/ComposerModal';
import { CATEGORIES } from '../lib/format';

// One house, three fixed floors (Health/Wealth/Relationships) — walk up to
// an achievement sticker on the back wall and press E to open its full
// detail; AchievementDetailModal is unchanged. `?floor=<category>` deep
// links to a specific floor (used by the profile's Trophy Case).
export default function AchievementsPage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const showToast = useToast();
  const isMe = user?.id === authorId;

  const [photoTask, setPhotoTask] = useState(null);
  const [view, setView] = useState('house');
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAchievement, setActiveAchievement] = useState(null);
  const [focusedLabel, setFocusedLabel] = useState(null);

  const requestedCategory = searchParams.get('floor');
  const initialFloor = Math.max(0, CATEGORIES.findIndex((c) => c.id === requestedCategory));
  const floorIndex = initialFloor;
  const category = CATEGORIES[floorIndex];
  const floorAchievements = achievements.filter((a) => a.category === category.id);
  function selectFloor(index) {
    setFocusedLabel(null);
    setSearchParams((params) => {
      params.set('floor', CATEGORIES[index].id);
      return params;
    }, { replace: true });
  }

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [profileRes, achievementsRes] = await Promise.all([
        api.get(`/api/profile/${authorId}`),
        api.get('/api/posts/achievements', { params: { authorId } }),
      ]);
      setProfile(profileRes.data.user);
      setAchievements(achievementsRes.data.achievements);
      setGoals(achievementsRes.data.goals);
    } catch (err) {
      setError(err.message);
      showToast(err.message, true);
    }
  }, [authorId, showToast]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (error && !loading) {
    return <div className="three-loading-shell"><div role="alert"><p>{error}</p><button onClick={() => { setLoading(true); refresh().finally(() => setLoading(false)); }}>Try again</button></div></div>;
  }

  if (loading || !profile) {
    return <div className="three-loading-shell"><p>Loading house…</p></div>;
  }

  return (
    <div className={view === 'house' ? 'achievement-house-page' : 'three-page'}>
      <div className="three-header-overlay">
        <button type="button" className="three-back-btn" onClick={() => navigate(`/profile/${authorId}`)}>
          ← Back to profile
        </button>
        <div className="three-room-label">{profile.displayName}’s Achievement House</div>
      </div>

      {view === 'house' ? (
        <main className="achievement-house-main">
          <header className="achievement-house-intro">
            <span className="house-eyebrow">A LITTLE PROGRESS, EVERY DAY</span>
            <h1>A home for your achievements.</h1>
            <p>Complete every task in a goal to earn an award for your floor.</p>
          </header>
          <div className="achievement-house-layout">
            <div className="house-scene" aria-label="Achievement house with three floors">
              <div className="house-roof" aria-hidden="true"><span>PackSomeWork</span></div>
              <div className="house-building">
                {[...CATEGORIES].reverse().map((c) => {
                  const index = CATEGORIES.findIndex((item) => item.id === c.id);
                  const items = achievements.filter((a) => a.category === c.id);
                  return (
                    <button key={c.id} type="button" className={`house-floor house-floor-${c.id}${index === floorIndex ? ' selected' : ''}`}
                      aria-pressed={index === floorIndex} aria-controls="house-floor-gallery" onClick={() => selectFloor(index)}>
                      <span className="house-window" aria-hidden="true"><span>{c.emoji}</span></span>
                      <span className="house-floor-copy"><small>FLOOR 0{index + 1}</small><strong>{c.label}</strong><span>{items.length} {items.length === 1 ? 'award earned' : 'awards earned'}</span><span className="house-floor-awards" aria-hidden="true">{items.slice(0, 5).map((a) => <span key={a.tag} title={`#${a.tag}`}>🏆</span>)}{items.length > 5 && <small>+{items.length - 5}</small>}</span></span>
                      <span className="house-floor-arrow" aria-hidden="true">↗</span>
                    </button>
                  );
                })}
              </div>
              <div className="house-foundation" aria-hidden="true" />
              <p className="house-caption">Built by you, one milestone at a time.</p>
            </div>
            <section id="house-floor-gallery" className={`house-gallery house-floor-${category.id}`} aria-labelledby="house-gallery-title">
              <span className="house-eyebrow">FLOOR 0{floorIndex + 1}</span>
              <h2 id="house-gallery-title">{category.emoji} {category.label}</h2>
              <p>{({ health: 'Grow stronger, feel better, and celebrate taking care of yourself.', wealth: 'Make room for your work, learning, and financial milestones.', relationships: 'Celebrate the connections and shared moments that matter.' })[category.id]}</p>
              <button type="button" className="house-enter-btn" onClick={() => setView('room')}>Explore this floor in 3D →</button>
              <div className="house-achievements">
                {floorAchievements.length ? floorAchievements.map((a) => (
                  <button type="button" key={a.tag} className="house-achievement" onClick={() => setActiveAchievement(a)}>
                    <span className="house-achievement-cover">
                      <span aria-hidden="true">🏆</span>
                    </span>
                    <span><strong>#{a.tag}</strong><small>Award earned · {a.goal.subtasks.length} tasks completed</small></span>
                    <span aria-hidden="true">→</span>
                  </button>
                )) : <div className="house-empty"><span aria-hidden="true">{category.emoji}</span><h3>Your first award awaits.</h3><p>{isMe ? 'Complete all tasks in a goal to earn an achievement and showcase its award here.' : 'No awards earned on this floor yet.'}</p>{isMe && <button type="button" className="house-enter-btn" onClick={() => navigate('/')}>Go to feed →</button>}</div>}
              </div>
            </section>
          </div>
          {isMe && <GoalOverview goals={[...goals, ...achievements]} onOpen={setActiveAchievement} onUploadTask={setPhotoTask} />}
        </main>
      ) : <>
      <RoomBoundary onBack={() => setView('house')}>
      <Suspense fallback={<div className="three-loading-shell" role="status">Opening your room…</div>}>
        <AchievementRoom achievements={achievements} floorIndex={floorIndex} onOpen={setActiveAchievement} onFocusChange={setFocusedLabel} paused={!!activeAchievement} />
      </Suspense>
      </RoomBoundary>
      <Crosshair focusedLabel={focusedLabel} />
      <div className="three-floor-selector">
        <button type="button" className="three-floor-btn" onClick={() => setView('house')}>← Whole house</button>
        {CATEGORIES.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`three-floor-btn${i === floorIndex ? ' active' : ''}`}
            aria-pressed={i === floorIndex}
            onClick={() => selectFloor(i)}
          >
            Floor {i + 1} · {c.emoji} {c.label}
          </button>
        ))}
      </div>

      </>}

      {photoTask && <ComposerModal kind="post" initialGoalTask={photoTask} onClose={() => setPhotoTask(null)} onCreated={refresh} />}
      {activeAchievement && (
        <AchievementDetailModal
          achievement={activeAchievement}
          isMe={isMe}
          onChanged={refresh}
          onClose={() => setActiveAchievement(null)}
          onOpenAuthor={(id) => navigate(`/profile/${id}`)}
          onOpenTag={(tag) => navigate(`/?tag=${encodeURIComponent(tag)}`)}
        />
      )}
    </div>
  );
}
