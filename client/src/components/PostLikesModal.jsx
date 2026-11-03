import { useEffect, useState } from 'react';
import api from '../api';
import useDialog from '../hooks/useDialog';
import Avatar from './Avatar';

export default function PostLikesModal({ postId, onClose, onOpenAuthor }) {
  const dialogRef = useDialog(onClose);
  const [users, setUsers] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get(`/api/posts/${postId}/likes`, { params: { offset } }).then(({ data }) => {
      if (cancelled) return;
      setUsers(current => offset === 0 ? data.users : [...current, ...data.users]);
      setHasMore(data.hasMore);
    }).catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId, offset, retry]);
  return <div className="modal-backdrop post-likes-backdrop" onMouseDown={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
    <div className="post-likes-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="post-likes-title">
      <div className="post-likes-heading"><h2 id="post-likes-title">Liked by</h2><button type="button" className="pill-btn" onClick={onClose} aria-label="Close likes">✕</button></div>
      <div className="post-likes-list">
        {users.map(person => <button type="button" className="post-likes-person" key={person.id} onClick={() => { onClose(); onOpenAuthor?.(person.id); }}><Avatar id={person.id} name={person.displayName} photoUrl={person.photoUrl} size={40} /><span>{person.displayName}</span><span aria-hidden="true">→</span></button>)}
        {loading && <p role="status">Loading likes…</p>}
        {!loading && !error && !users.length && <p>No likes yet. Be the first to like this post.</p>}
        {error && <div role="alert"><p>{error}</p><button type="button" className="pill-btn" onClick={() => { setLoading(true); setError(''); setRetry(value => value + 1); }}>Try again</button></div>}
        {!loading && !error && hasMore && <button type="button" className="pill-btn" onClick={() => { setLoading(true); setOffset(users.length); }}>Show more</button>}
      </div>
    </div>
  </div>;
}
