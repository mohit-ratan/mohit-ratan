import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import { RoomZone } from '../components/AchievementsRoom';
import AchievementDetailModal from '../components/AchievementDetailModal';
import { CAT_MAP } from '../lib/format';

// Full-screen view of a single achievements-room zone — reuses RoomZone
// unchanged (it was built from the start not knowing it's 1-of-3), just
// at size="large" and standing alone instead of sitting in a row of three.
export default function RoomPage() {
  const { id: authorId, category } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();
  const isMe = user?.id === authorId;

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAchievement, setActiveAchievement] = useState(null);

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

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const cat = CAT_MAP[category];

  if (loading || !profile || !cat) {
    return (
      <>
        <Header streak={0} counts={{}} />
        <div className="wrap"><main className="layout"><section className="feed-col"><div className="card empty-state"><p>Loading…</p></div></section></main></div>
      </>
    );
  }

  const filtered = achievements.filter((a) => a.category === category);

  return (
    <>
      <Header streak={0} counts={{}} onCompose={() => navigate('/')} />
      <div className="wrap">
        <main className="layout">
          <section className="feed-col">
            <div className="back-link" onClick={() => navigate(`/profile/${authorId}/achievements`)}>← Back to Achievements Room</div>
            <h2 className="profile-name" style={{ marginBottom: 14 }}>{cat.emoji} {profile.displayName}’s {cat.label} Room</h2>
            <RoomZone category={category} achievements={filtered} authorId={authorId} onOpen={setActiveAchievement} size="large" />
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
