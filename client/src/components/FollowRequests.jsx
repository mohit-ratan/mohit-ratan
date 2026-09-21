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
      .then(({ data }) => setRequests(data.requests.map((r) => ({ ...r, accepted: false, followBackStatus: 'none' }))))
      .catch((err) => showToast(err.message, true))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function accept(id) {
    try {
      await api.patch(`/api/follows/${id}`, { action: 'accept' });
      setRequests((current) => current.map((r) => (r.id === id ? { ...r, accepted: true } : r)));
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function decline(id) {
    try {
      await api.patch(`/api/follows/${id}`, { action: 'reject' });
      setRequests((current) => current.filter((r) => r.id !== id));
    } catch (err) {
      showToast(err.message, true);
    }
  }

  async function followBack(id) {
    try {
      const { data } = await api.post(`/api/follows/${id}`);
      setRequests((current) => current.map((r) => (r.id === id ? { ...r, followBackStatus: data.status } : r)));
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
              {r.accepted ? (
                r.followBackStatus === 'accepted' ? (
                  <button type="button" className="pill-btn" disabled>Following</button>
                ) : r.followBackStatus === 'pending' ? (
                  <button type="button" className="pill-btn" disabled>Requested</button>
                ) : (
                  <button type="button" className="pill-btn primary" onClick={() => followBack(r.id)}>Follow back</button>
                )
              ) : (
                <>
                  <button type="button" className="pill-btn primary" onClick={() => accept(r.id)}>Accept</button>
                  <button type="button" className="pill-btn" onClick={() => decline(r.id)}>Decline</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
