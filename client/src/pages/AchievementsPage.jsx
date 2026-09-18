import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import HouseEntry from '../components/HouseEntry';
import HouseHallway from '../components/HouseHallway';

export default function AchievementsPage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, achievementsRes] = await Promise.all([
        api.get(`/api/profile/${authorId}`),
        api.get('/api/posts/achievements', { params: { authorId } }),
      ]);
      setProfile(profileRes.data.user);
      setAchievements(achievementsRes.data.achievements);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setEntered(false); }, [authorId]);

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
            <div
              className="back-link"
              onClick={() => (entered ? setEntered(false) : navigate(`/profile/${authorId}`))}
            >
              ← Back to {entered ? 'the front door' : 'profile'}
            </div>
            <h2 className="profile-name" style={{ marginBottom: 14 }}>{profile.displayName}’s Achievements Room</h2>
            {entered ? (
              <HouseHallway achievements={achievements} authorId={authorId} />
            ) : (
              <HouseEntry displayName={profile.displayName} onEnter={() => setEntered(true)} />
            )}
          </section>
          <aside className="side-col" />
        </main>
      </div>
    </>
  );
}
