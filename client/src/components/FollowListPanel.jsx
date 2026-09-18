import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from './Avatar';

function FollowList({ title, authorId, endpoint }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    api.get(`/api/follows/${authorId}/${endpoint}`)
      .then(({ data }) => setUsers(data.users))
      .catch(() => setUsers([]))
      .finally(() => setLoaded(true));
  }, [authorId, endpoint]);

  if (!loaded) return null;

  return (
    <div className="card side-card follow-list-panel">
      <h4>{title} <span>{users.length}</span></h4>
      {users.length ? (
        <ul className="follow-list">
          {users.map((u) => (
            <li key={u.id}>
              <button type="button" className="follow-list-person" onClick={() => navigate(`/profile/${u.id}`)}>
                <Avatar id={u.id} name={u.displayName} photoUrl={u.photoUrl} size={36} />
                <span>{u.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="follow-list-empty">No one yet.</p>
      )}
    </div>
  );
}

export default function FollowListPanel({ authorId }) {
  return (
    <>
      <FollowList title="Followers" authorId={authorId} endpoint="followers" />
      <FollowList title="Following" authorId={authorId} endpoint="following" />
    </>
  );
}
