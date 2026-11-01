import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GoldAward from '../components/GoldAward';
import ProgressAward from '../components/ProgressAward';
import FireAwardIcon from '../components/FireAwardIcon';
import AchievementDetailModal from '../components/AchievementDetailModal';
import GoalOverview from '../components/GoalOverview';
import ComposerModal from '../components/ComposerModal';
import { CategoryIcon } from '../lib/icons';
import { CATEGORIES } from '../lib/format';

export default function AchievementsPage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const showToast = useToast();
  const isMe = user?.id === authorId;
  const [photoTask, setPhotoTask] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [goals, setGoals] = useState([]);
  const [streakAwards, setStreakAwards] = useState([]);
  const [trifecta, setTrifecta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAchievement, setActiveAchievement] = useState(null);
  // Preserve existing profile links while retiring the house/floor presentation.
  const requestedCategory = searchParams.get('category') || searchParams.get('floor');
  const category = CATEGORIES.find(item => item.id === requestedCategory) || CATEGORIES[0];
  const categoryGoals = achievements.filter(item => item.category === category.id);
  const categoryStreaks = streakAwards.filter(item => item.category === category.id);

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
      setStreakAwards(achievementsRes.data.streakAwards || []);
      setTrifecta(achievementsRes.data.trifecta || null);
    } catch (err) {
      setError(err.message);
      showToast(err.message, true);
    }
  }, [authorId, showToast]);
  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (error && !loading) return <div className="three-loading-shell"><div role="alert"><p>{error}</p><button onClick={() => { setLoading(true); refresh().finally(() => setLoading(false)); }}>Try again</button></div></div>;
  if (loading || !profile) return <div className="three-loading-shell"><p>Loading achievements…</p></div>;

  return <div className="achievements-page">
    <header className="achievements-header">
      <button type="button" className="house-enter-btn" onClick={() => navigate(`/profile/${authorId}`)}>← Back to profile</button>
      <h1>{isMe ? 'Your achievements' : `${profile.displayName}’s achievements`}</h1>
    </header>
    <main className="achievements-main">
      {trifecta?.earned && <GoldAward earned />}
      <nav className="achievement-category-nav" aria-label="Award category">
        {CATEGORIES.map(item => <button key={item.id} type="button" className={`house-enter-btn${category.id === item.id ? ' selected' : ''}`} aria-pressed={category.id === item.id} onClick={() => navigate(`/profile/${authorId}/achievements?category=${item.id}`, { replace: true })}><CategoryIcon category={item.id} />{item.label}</button>)}
      </nav>
      <section className="earned-awards-section" aria-labelledby="earned-goal-awards">
        <h2 id="earned-goal-awards">{category.label} goal awards</h2>
        {categoryGoals.length ? <div className="earned-awards-grid">{categoryGoals.map(item => {
          const days = item.goal.subtasks.reduce((total, task) => total + task.targetDays, 0);
          return <article className="earned-award-card" key={item.tag}>
            <ProgressAward category={item.category} kind="goal" task={{ text: `#${item.tag}`, targetDays: days, completedDays: days }} />
            <button type="button" className="house-enter-btn" onClick={() => setActiveAchievement(item)}>View goal →</button>
          </article>;
        })}</div> : <p className="award-empty">No completed {category.label.toLowerCase()} goals yet. Finish every task in a goal to earn its award.</p>}
      </section>
      <section className="earned-awards-section" aria-labelledby="earned-streak-awards">
        <h2 id="earned-streak-awards">{category.label} streak awards</h2>
        <p>Seven consecutive days earns a fire award. It grows with your run and keeps the final day count when the streak ends.</p>
        {categoryStreaks.length ? <div className="earned-awards-grid">{categoryStreaks.map(award => <figure className="earned-award-card streak-award-card" key={`${award.tag}:${award.id}`}>
          <div role="img" aria-label={`${award.days}-day ${category.label.toLowerCase()} streak award`}><FireAwardIcon days={award.days} /></div>
          <figcaption><h3>{award.days}-day streak</h3><strong>#{award.tag}</strong><p>{award.active ? 'Still growing' : 'Completed run · yours to keep'}</p><small>{award.startedOn} — {award.endedOn}</small></figcaption>
        </figure>)}</div> : <p className="award-empty">No fire awards yet. Check in on the same goal for seven consecutive days.</p>}
      </section>
      {isMe && <GoalOverview goals={[...goals, ...achievements]} onOpen={setActiveAchievement} onUploadTask={setPhotoTask} />}
    </main>
    {photoTask && <ComposerModal kind="post" initialGoalTask={photoTask} onClose={() => setPhotoTask(null)} onCreated={refresh} />}
    {activeAchievement && <AchievementDetailModal achievement={activeAchievement} isMe={isMe} onChanged={refresh} onClose={() => setActiveAchievement(null)} onOpenAuthor={id => navigate(`/profile/${id}`)} onOpenTag={tag => navigate(`/?tag=${encodeURIComponent(tag)}`)} />}
  </div>;
}
