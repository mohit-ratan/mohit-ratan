import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';

export default function FollowRequests() {
  const showToast = useToast();
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/follows/requests')
      .then(({ data }) => setRequests(data.requests))
      .catch((err) => showToast(err.message, true))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(id, action) {
    try {
      await api.patch(`/api/follows/${id}`, { action });
      setRequests((current) => current.filter((r) => r.id !== id));
    } catch (err) {
      showToast(err.message, true);
    }
  }

  if (!loaded || !requests.length) return null;

  return (
    <div className="card follow-requests">
      <h3>Follow requests</h3>
      <ul className="follow-requests-list">
        {requests.map((r) => (
          <li key={r.id}>
            <Avatar id={r.id} name={r.displayName} photoUrl={r.photoUrl} size={40} />
            <span className="follow-request-name">{r.displayName}</span>
            <div className="follow-request-actions">
              <button type="button" className="pill-btn primary" onClick={() => respond(r.id, 'accept')}>Accept</button>
              <button type="button" className="pill-btn" onClick={() => respond(r.id, 'reject')}>Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
