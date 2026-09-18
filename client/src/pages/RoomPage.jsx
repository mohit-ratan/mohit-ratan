import { Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import HouseInterior from '../three/HouseInterior';
import Crosshair from '../three/Crosshair';
import AchievementDetailModal from '../components/AchievementDetailModal';
import { CAT_MAP } from '../lib/format';

// One category's house — a small walkable room per achievement ("floor"),
// switched via the floor selector overlay rather than physically climbing
// stairs. Walk up to the achievement sticker on the back wall and press E
// to open its full detail; AchievementDetailModal is unchanged.
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
  const [floorIndex, setFloorIndex] = useState(0);

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
  const filtered = achievements.filter((a) => a.category === category);

  useEffect(() => {
    setFloorIndex(0);
  }, [category]);

  if (loading || !profile || !cat) {
    return <div className="three-loading-shell"><p>Loading house…</p></div>;
  }

  const clampedFloor = Math.min(floorIndex, Math.max(filtered.length - 1, 0));

  return (
    <div className="three-page">
      <div className="three-header-overlay">
        <button type="button" className="three-back-btn" onClick={() => navigate(`/profile/${authorId}/achievements`)}>
          ← Achievement Houses
        </button>
        <div className="three-room-label">{cat.emoji} {profile.displayName}’s {cat.label} House</div>
      </div>

      {filtered.length === 0 ? (
        <div className="three-loading-shell">
          <p>No {cat.label.toLowerCase()} achievements yet — complete a goal to build this house's first floor.</p>
        </div>
      ) : (
        <>
          <Canvas camera={{ position: [0, 1.6, 2.5], fov: 62 }}>
            <Suspense fallback={null}>
              <HouseInterior
                achievements={filtered}
                floorIndex={clampedFloor}
                onOpen={setActiveAchievement}
                onFocusChange={setFocusedLabel}
              />
            </Suspense>
          </Canvas>
          <Crosshair focusedLabel={focusedLabel} />
          <div className="three-floor-selector">
            {filtered.map((a, i) => (
              <button
                key={a.tag}
                type="button"
                className={`three-floor-btn${i === clampedFloor ? ' active' : ''}`}
                onClick={() => setFloorIndex(i)}
              >
                Floor {i + 1} · #{a.tag}
              </button>
            ))}
          </div>
        </>
      )}

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
