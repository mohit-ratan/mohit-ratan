import { Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import HouseScene from '../three/HouseScene';
import Crosshair from '../three/Crosshair';
import AchievementDetailModal from '../components/AchievementDetailModal';

// Full-viewport 3D glass house — WASD to drive, press E near a plinth to
// open that achievement. All three rooms are visible/driveable in one
// scene; AchievementDetailModal is a normal DOM overlay on top.
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
  const [focusedLabel, setFocusedLabel] = useState(null);

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

  if (loading || !profile) {
    return <div className="three-loading-shell"><p>Loading house…</p></div>;
  }

  return (
    <div className="three-page">
      <div className="three-header-overlay">
        <button type="button" className="three-back-btn" onClick={() => navigate(`/profile/${authorId}`)}>
          ← Back to profile
        </button>
        <div className="three-room-label">{profile.displayName}’s Achievements House</div>
      </div>
      <Canvas camera={{ position: [0, 3.2, 19.5], fov: 60 }}>
        <Suspense fallback={null}>
          <HouseScene achievements={achievements} onOpen={setActiveAchievement} onFocusChange={setFocusedLabel} />
        </Suspense>
      </Canvas>
      <Crosshair focusedLabel={focusedLabel} />
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
