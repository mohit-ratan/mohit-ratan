import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from './Avatar';
import { useToast } from '../context/ToastContext';

export default function AccountabilityWidget() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [partners, setPartners] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/partners')
      .then(({ data }) => setPartners(data.partners))
      .catch(() => setPartners([]))
      .finally(() => setLoaded(true));
  }, []);

  async function endPartnership(id) {
    if (!window.confirm('End this accountability partnership?')) return;
    try {
      await api.delete(`/api/partners/${id}`);
      setPartners((current) => current.filter((p) => p.id !== id));
    } catch {
      showToast('Could not end that partnership. Please try again.', true);
    }
  }

  if (!loaded || !partners.length) return null;

  return (
    <div className="card side-card">
      <h4>🤝 Accountability partners</h4>
      <ul className="follow-list">
        {partners.map((p) => (
          <li key={p.id} className="suggested-follow-row">
            <div className="suggested-follow-top">
              <button type="button" className="follow-list-person" onClick={() => navigate(`/profile/${p.id}`)}>
                <Avatar id={p.id} name={p.displayName} photoUrl={p.photoUrl} size={36} />
                <span>{p.displayName}</span>
              </button>
              <button type="button" className="goal-remove-btn" onClick={() => endPartnership(p.id)}>End</button>
            </div>
            <div className={`partner-status ${p.postedToday ? 'ok' : 'warn'}`}>
              {p.postedToday ? '✅ Posted today' : "⚠️ Hasn't posted today yet"}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
