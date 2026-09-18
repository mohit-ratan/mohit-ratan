import { Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import api from '../api';
import { useToast } from '../context/ToastContext';
import HallwayScene from '../three/HallwayScene';
import Crosshair from '../three/Crosshair';

// Full-viewport 3D plaza — WASD to drive, press E near a zone marker to
// enter that category's open yard (RoomScene).
export default function AchievementsPage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focusedLabel, setFocusedLabel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/profile/${authorId}`);
      setProfile(data.user);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [authorId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !profile) {
    return <div className="three-loading-shell"><p>Loading plaza…</p></div>;
  }

  return (
    <div className="three-page">
      <div className="three-header-overlay">
        <button type="button" className="three-back-btn" onClick={() => navigate(`/profile/${authorId}`)}>
          ← Back to profile
        </button>
        <div className="three-room-label">{profile.displayName}’s Achievements Room</div>
      </div>
      <Canvas camera={{ position: [0, 3.2, 15.5], fov: 60 }}>
        <Suspense fallback={null}>
          <HallwayScene
            onEnter={(category) => navigate(`/profile/${authorId}/room/${category}`)}
            onFocusChange={setFocusedLabel}
          />
        </Suspense>
      </Canvas>
      <Crosshair focusedLabel={focusedLabel} />
    </div>
  );
}
