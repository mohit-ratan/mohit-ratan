import { Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RoomScene from '../three/RoomScene';
import Crosshair from '../three/Crosshair';
import AchievementDetailModal from '../components/AchievementDetailModal';
import { CAT_MAP } from '../lib/format';

// Full-viewport 3D view of a single category's open drivable yard — WASD to
// drive, press E near an achievement plinth to open it. AchievementDetailModal
// is a normal DOM overlay and needs no changes to work on top of the canvas.
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

  const cat = CAT_MAP[category];

  if (loading || !profile || !cat) {
    return <div className="three-loading-shell"><p>Loading room…</p></div>;
  }

  const filtered = achievements.filter((a) => a.category === category);

  return (
    <div className="three-page">
      <div className="three-header-overlay">
        <button type="button" className="three-back-btn" onClick={() => navigate(`/profile/${authorId}/achievements`)}>
          ← Achievements Room
        </button>
        <div className="three-room-label">{cat.emoji} {profile.displayName}’s {cat.label} Yard</div>
      </div>
      <Canvas camera={{ position: [0, 3.2, 13.5], fov: 60 }}>
        <Suspense fallback={null}>
          <RoomScene
            category={category}
            achievements={filtered}
            onOpen={setActiveAchievement}
            onFocusChange={setFocusedLabel}
          />
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
