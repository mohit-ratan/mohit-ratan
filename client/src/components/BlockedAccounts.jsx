import { useEffect, useState } from 'react';
import api from '../api';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';

export default function BlockedAccounts() {
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/blocks')
      .then(({ data }) => setUsers(data.users))
      .catch((err) => showToast(err.message, true))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unblock(id) {
    try {
      await api.delete(`/api/blocks/${id}`);
      setUsers((current) => current.filter((u) => u.id !== id));
    } catch (err) {
      showToast(err.message, true);
    }
  }

  if (!loaded || !users.length) return null;

  return (
    <div className="card follow-requests">
      <h3>Blocked accounts</h3>
      <ul className="follow-requests-list">
        {users.map((u) => (
          <li key={u.id}>
            <Avatar id={u.id} name={u.displayName} photoUrl={u.photoUrl} size={40} />
            <span className="follow-request-name">{u.displayName}</span>
            <div className="follow-request-actions">
              <button type="button" className="pill-btn" onClick={() => unblock(u.id)}>Unblock</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
