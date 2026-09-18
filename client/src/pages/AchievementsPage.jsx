import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import AchievementsRoom from '../components/AchievementsRoom';
import AchievementDetailModal from '../components/AchievementDetailModal';

export default function AchievementsPage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();
  const isMe = user?.id === authorId;

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAchievement, setActiveAchievement] = useState(null);

  // Silent refresh — no loading flag, so it can run in the background while
  // a modal is open (e.g. after editing/deleting a post or goal) without
  // unmounting the page's loading-shell branch out from under it.
  const refresh = useCallback(async () => {
    try {
      const [profileRes, achievementsRes] = await Promise.all([
        api.get(`/api/profile/${authorId}`),
        api.get('/api/posts/achievements', { params: { authorId } }),
      ]);
      setProfile(profileRes.data.user);
      setAchievements(achievementsRes.data.achievements);
    } catch (err) {
      showToast(err.message, true);
    }
  }, [authorId]);

  const load = useCallback(async () => {
    setLoading(true);
    await refresh();
    setLoading(false);
  }, [refresh]);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return (
      <>
        <Header streak={0} counts={{}} />
        <div className="wrap"><main className="layout"><section className="feed-col"><div className="card empty-state"><p>Loading…</p></div></section></main></div>
      </>
    );
  }

  return (
    <>
      <Header streak={0} counts={{}} onCompose={() => navigate('/')} />
      <div className="wrap">
        <main className="layout">
          <section className="feed-col">
            <div className="back-link" onClick={() => navigate(`/profile/${authorId}`)}>← Back to profile</div>
            <h2 className="profile-name" style={{ marginBottom: 14 }}>{profile.displayName}’s Achievements Room</h2>
            <AchievementsRoom achievements={achievements} onOpen={setActiveAchievement} />
          </section>
          <aside className="side-col" />
        </main>
      </div>
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
    </>
  );
}
