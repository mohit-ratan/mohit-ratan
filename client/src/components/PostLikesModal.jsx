import { POST_CHEERS, isMemeReaction, memeReaction } from '../lib/reactions';
import { useEffect, useState } from 'react';
import api from '../api';
import useDialog from '../hooks/useDialog';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function PostLikesModal({ postId, onClose, onOpenAuthor, kind = 'likes', reaction }) {
  const dialogRef = useDialog(onClose);
  const { user } = useAuth();
  const [actionError, setActionError] = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());
  const title = { likes: 'Liked by', comments: 'People who commented', cheers: reaction ? `${reaction} Cheers` : 'Cheered by' }[kind];
  async function follow(person) {
    if (followingIds.has(person.id)) return;
    setActionError('');
    setFollowingIds(current => new Set(current).add(person.id));
    try {
      const { data } = person.followStatus === 'accepted' || person.followStatus === 'pending'
        ? await api.delete(`/api/follows/${person.id}`)
        : await api.post(`/api/follows/${person.id}`);
      setUsers(current => current.map(item => item.id === person.id ? { ...item, followStatus: data.status } : item));
    } catch (err) { setActionError(err.message); }
    finally { setFollowingIds(current => { const next = new Set(current); next.delete(person.id); return next; }); }
  }
  const [users, setUsers] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get(`/api/posts/${postId}/people/${kind}`, { params: { offset, reaction } }).then(({ data }) => {
      if (cancelled) return;
      setUsers(current => offset === 0 ? data.users : [...current, ...data.users]);
      setHasMore(data.hasMore);
    }).catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId, kind, reaction, offset, retry]);
  return <div className="modal-backdrop post-likes-backdrop" onMouseDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
    <div className="post-likes-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="post-likes-title">
      <div className="post-likes-heading"><h2 id="post-likes-title">{title}</h2><button type="button" className="pill-btn" onClick={onClose} aria-label="Close people list">✕</button></div>
      <div className="post-likes-list">
        {actionError && <p role="alert" className="auth-error">{actionError}</p>}
        {users.map(person => <div className="post-person-row" key={person.id}>
          <button type="button" className="post-likes-person" onClick={() => { onClose(); onOpenAuthor?.(person.id); }}><Avatar id={person.id} name={person.displayName} photoUrl={person.photoUrl} size={40} /><span className="post-person-copy"><span>{person.displayName}</span>{kind === 'cheers' && person.cheer && <small>{POST_CHEERS.find(item => item.key === person.cheer)?.label || (isMemeReaction(person.cheer) ? memeReaction(person.cheer)?.label : 'Cheered')} <span aria-hidden="true">{isMemeReaction(person.cheer) ? memeReaction(person.cheer)?.emoji : person.cheer}</span></small>}</span></button>
          {person.id !== user?.id && <button type="button" className={`pill-btn post-person-follow${!person.followStatus || person.followStatus === 'none' ? ' primary' : ''}`} disabled={followingIds.has(person.id)} onClick={() => follow(person)}>
            {followingIds.has(person.id) ? 'Sending…' : person.followStatus === 'accepted' ? 'Unfollow' : person.followStatus === 'pending' ? 'Cancel request' : 'Follow'}
          </button>}
        </div>)}
        {loading && <p role="status">Loading people…</p>}
        {!loading && !error && !users.length && <p>No people to show yet.</p>}
        {error && <div role="alert"><p>{error}</p><button type="button" className="pill-btn" onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1); }}>Try again</button></div>}
        {!loading && !error && hasMore && <button type="button" className="pill-btn" onClick={() => { setLoading(true); setOffset(users.length); }}>Show more</button>}
      </div>
    </div>
  </div>;
}
