import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES } from '../lib/format';

// A plain 2D hub — one card per category "house." Picking one opens
// RoomPage, the actual 3D walkable house for that category. No Canvas
// here: this page doesn't need to carry any WebGL risk just to pick a
// house.
export default function AchievementsPage() {
  const { id: authorId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get(`/api/profile/${authorId}`),
      api.get('/api/posts/achievements', { params: { authorId } }),
    ])
      .then(([profileRes, achievementsRes]) => {
        if (cancelled) return;
        setProfile(profileRes.data.user);
        setAchievements(achievementsRes.data.achievements);
      })
      .catch((err) => showToast(err.message, true))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [authorId]);

  if (loading || !profile) {
    return <div className="three-loading-shell"><p>Loading houses…</p></div>;
  }

  return (
    <div className="wrap achievements-hub">
      <div className="back-link" onClick={() => navigate(`/profile/${authorId}`)}>← Back to profile</div>
      <h1 className="achievements-hub-title">{profile.displayName}’s Achievement Houses</h1>
      <p className="achievements-hub-sub">Each house has one floor per completed goal, with your task stickers on the walls.</p>
      <div className="achievements-hub-grid">
        {CATEGORIES.map((c) => {
          const count = achievements.filter((a) => a.category === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              className="achievement-house-card"
              onClick={() => navigate(`/profile/${authorId}/room/${c.id}`)}
            >
              <span className="achievement-house-emoji">{c.emoji}</span>
              <span className="achievement-house-label">{c.label} House</span>
              <span className="achievement-house-count">{count} floor{count === 1 ? '' : 's'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
