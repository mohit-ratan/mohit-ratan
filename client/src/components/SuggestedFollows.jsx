import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from './Avatar';

export default function SuggestedFollows({ onTagClick }) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingIds, setPendingIds] = useState(new Set());

  useEffect(() => {
    api.get('/api/users/suggestions')
      .then(({ data }) => setSuggestions(data.suggestions))
      .catch(() => setSuggestions([]))
      .finally(() => setLoaded(true));
  }, []);

  async function follow(id) {
    setPendingIds((current) => new Set(current).add(id));
    try {
      await api.post(`/api/follows/${id}`);
      setSuggestions((current) => current.filter((s) => s.id !== id));
    } catch {
      setPendingIds((current) => { const next = new Set(current); next.delete(id); return next; });
    }
  }

  if (!loaded || !suggestions.length) return null;

  return (
    <div className="card side-card suggested-follows">
      <h4>🎯 Similar goals</h4>
      <ul className="follow-list">
        {suggestions.map((s) => (
          <li key={s.id} className="suggested-follow-row">
            <div className="suggested-follow-top">
              <button type="button" className="follow-list-person" onClick={() => navigate(`/profile/${s.id}`)}>
                <Avatar id={s.id} name={s.displayName} photoUrl={s.photoUrl} size={36} />
                <span>{s.displayName}</span>
              </button>
              <button type="button" className="pill-btn primary" disabled={pendingIds.has(s.id)} onClick={() => follow(s.id)}>
                Follow
              </button>
            </div>
            <div className="suggested-follow-reason">
              <span className="suggested-follow-reason-label">Matches on</span>
              {s.matchingTags.map((t) => (
                <span key={t} className="tag-chip" onClick={() => onTagClick?.(t)}>#{t}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
