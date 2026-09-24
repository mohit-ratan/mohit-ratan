import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import Avatar from './Avatar';
import api from '../api';
import { CATEGORIES, timeAgo } from '../lib/format';
import { SearchIcon, BellIcon } from '../lib/icons';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function Header({
  activeCategory = 'all',
  onCategoryChange,
  counts = {},
  searchQuery = '',
  onSearchChange,
  streak = 0,
}) {
  const navigate = useNavigate();
  const showToast = useToast();
  const [localSearch, setLocalSearch] = useState('');
  const effectiveSearch = onSearchChange ? searchQuery : localSearch;
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [people, setPeople] = useState([]);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [tagResults, setTagResults] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [partnerRequests, setPartnerRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const requestsRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!requestsOpen) return;
    function handleClickOutside(e) {
      if (requestsRef.current && !requestsRef.current.contains(e.target)) setRequestsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [requestsOpen]);

  // Polls rather than pushing, since there's no websocket/SSE layer in this
  // app — good enough for a personal-scale notification inbox.
  useEffect(() => {
    let cancelled = false;
    function load() {
      Promise.all([
        api.get('/api/follows/requests'),
        api.get('/api/partners/requests'),
        api.get('/api/notifications'),
      ]).then(([reqRes, partnerReqRes, notifRes]) => {
        if (!cancelled) {
          setRequests(reqRes.data.requests);
          setPartnerRequests(partnerReqRes.data.requests);
          setNotifications(notifRes.data.notifications);
        }
      }).catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Polling refetches only pending requests every 30s, which would wipe an
  // accepted-but-not-yet-followed-back row before the user can act on it —
  // so accepted entries move into their own list, untouched by polling.
  const [justAccepted, setJustAccepted] = useState([]);

  async function respondRequest(id, action) {
    try {
      const { data } = await api.patch(`/api/follows/${id}`, { action });
      setRequests((current) => {
        if (action === 'accept' && !data.alreadyFollowingBack) {
          const accepted = current.find((r) => r.id === id);
          if (accepted) setJustAccepted((j) => [...j, { ...accepted, followBackStatus: 'none' }]);
        }
        return current.filter((r) => r.id !== id);
      });
    } catch { showToast('Could not update this follow request. Please try again.', true); }
  }

  async function followBackRequest(id) {
    try {
      const { data } = await api.post(`/api/follows/${id}`);
      setJustAccepted((current) => current.map((r) => (r.id === id ? { ...r, followBackStatus: data.status } : r)));
    } catch {
      showToast('Could not send your follow request. Please try again.', true);
    }
  }

  async function respondPartnerRequest(id, action) {
    try {
      await api.patch(`/api/partners/${id}`, { action });
      setPartnerRequests((current) => current.filter((r) => r.id !== id));
    } catch { showToast('Could not update this request. Please try again.', true); }
  }

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  function toggleBell() {
    setRequestsOpen((open) => {
      const next = !open;
      if (next && unreadNotifCount > 0) {
        api.post('/api/notifications/read')
          .then(() => setNotifications((current) => current.map((n) => ({ ...n, read: true }))))
          .catch(() => {});
      }
      return next;
    });
  }

  function notificationText(n) {
    if (n.type === 'like') return `${n.actorName} liked your post`;
    if (n.type === 'reaction') return `${n.actorName} reacted to your post`;
    if (n.type === 'comment') return `${n.actorName} commented on your post`;
    if (n.type === 'follow_accepted') return `${n.actorName} accepted your follow request`;
    if (n.type === 'partner_request') return `${n.actorName} wants to be your accountability partner`;
    if (n.type === 'partner_accepted') return `${n.actorName} accepted your accountability partner request`;
    if (n.type === 'partner_missed') return `${n.actorName} didn't post yesterday — check in on them`;
    return `${n.actorName} interacted with you`;
  }

  useEffect(() => {
    if (!peopleOpen) return;
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setPeopleOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [peopleOpen]);

  useEffect(() => {
    const q = effectiveSearch.trim();
    let cancelled = false;
    if (!q) { setPeople([]); setPeopleLoading(false); setTagResults([]); setTagsLoading(false); return; }
    setPeopleLoading(true);
    setTagsLoading(true);
    const timer = setTimeout(() => {
      api.get('/api/users/search', { params: { q } })
        .then(({ data }) => { if (!cancelled) setPeople(data.users); })
        .catch(() => { if (!cancelled) setPeople([]); })
        .finally(() => { if (!cancelled) setPeopleLoading(false); });
      api.get('/api/posts/search-tags', { params: { q: q.replace(/^#/, '') } })
        .then(({ data }) => { if (!cancelled) setTagResults(data.tags); })
        .catch(() => { if (!cancelled) setTagResults([]); })
        .finally(() => { if (!cancelled) setTagsLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [effectiveSearch]);

  function openTagResult(tag) {
    setPeopleOpen(false);
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  }

  async function sendFollowRequest(id) {
    try {
      const { data } = await api.post(`/api/follows/${id}`);
      setPeople((current) => current.map((p) => (p.id === id ? { ...p, followStatus: data.status } : p)));
    } catch {
      showToast('Could not send your follow request. Please try again.', true);
    }
  }

  function openPerson(id) {
    setPeopleOpen(false);
    navigate(`/profile/${id}`);
  }

  function handleCategoryClick(id) {
    if (onCategoryChange) onCategoryChange(id);
    else navigate(id === 'all' ? '/' : `/?category=${id}`);
  }

  function handleLogout() {
    setMenuOpen(false);
    signOut();
    navigate('/login');
  }

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <button type="button" className="brand" title="Home" onClick={() => navigate('/')}>
          <BrandLogo />
          <span className="brand-mark">PackSomeWork</span>
        </button>
        <span className="brand-tag">health · wealth · relationships</span>
        <div className={`search-box${effectiveSearch ? ' has-value' : ''}`} ref={searchBoxRef}>
          <SearchIcon />
          <input
            type="text"
            aria-label="Search posts and people"
            placeholder="Search posts, people, #tags"
            autoComplete="off"
            value={effectiveSearch}
            onChange={(e) => { (onSearchChange || setLocalSearch)(e.target.value); setPeopleOpen(true); }}
            onFocus={() => setPeopleOpen(true)}
          />
          <button
            className="clear-btn"
            title="Clear search"
            aria-label="Clear search"
            onClick={() => (onSearchChange || setLocalSearch)('')}
          >
            ✕
          </button>
          {peopleOpen && effectiveSearch.trim() && (
            <div className="people-search-dropdown">
              {(tagsLoading ? true : tagResults.length > 0) && (
                <div className="people-search-section">
                  <span className="people-search-section-label">Tags</span>
                  {tagsLoading ? (
                    <div className="people-search-empty">Searching…</div>
                  ) : (
                    tagResults.map((t) => (
                      <button type="button" key={t.tag} className="people-search-tag" onClick={() => openTagResult(t.tag)}>
                        <span>#{t.tag}</span><span className="people-search-tag-count">{t.count}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {!tagsLoading && tagResults.length > 0 && <div className="people-search-section-label">People</div>}
              {peopleLoading ? (
                <div className="people-search-empty">Searching…</div>
              ) : people.length ? (
                people.map((p) => (
                  <div key={p.id} className="people-search-row">
                    <button type="button" className="people-search-person" onClick={() => openPerson(p.id)}>
                      <Avatar id={p.id} name={p.displayName} photoUrl={p.photoUrl} size={32} />
                      <span>{p.displayName}</span>
                    </button>
                    {p.followStatus === 'none' && (
                      <button type="button" className="pill-btn primary" onClick={() => sendFollowRequest(p.id)}>Follow</button>
                    )}
                    {p.followStatus === 'pending' && (
                      <button type="button" className="pill-btn" disabled>Requested</button>
                    )}
                    {p.followStatus === 'accepted' && (
                      <button type="button" className="pill-btn" disabled>Following</button>
                    )}
                  </div>
                ))
              ) : (
                !tagsLoading && !tagResults.length && <div className="people-search-empty">No people or tags found for "{effectiveSearch.trim()}"</div>
              )}
            </div>
          )}
        </div>
        <div className="header-actions">
          <button type="button" className="header-link-btn" title="Awards gallery" onClick={() => navigate('/awards')}>
            🏆 <span>Awards</span>
          </button>
          <div className="bell-wrap" ref={requestsRef}>
            <button
              className="bell-btn"
              type="button"
              title="Notifications"
              aria-label="Notifications"
              onClick={toggleBell}
            >
              <BellIcon />
              {(requests.length + partnerRequests.length + unreadNotifCount) > 0 && <span className="bell-badge">{requests.length + partnerRequests.length + unreadNotifCount}</span>}
            </button>
            {requestsOpen && (
              <div className="me-menu bell-menu">
                {requests.length > 0 && (
                  <div className="bell-section">
                    <span className="bell-section-label">Follow requests</span>
                    {requests.map((r) => (
                      <div key={r.id} className="bell-request-row">
                        <button type="button" className="people-search-person" onClick={() => { setRequestsOpen(false); navigate(`/profile/${r.id}`); }}>
                          <Avatar id={r.id} name={r.displayName} photoUrl={r.photoUrl} size={32} />
                          <span>{r.displayName}</span>
                        </button>
                        <div className="follow-request-actions">
                          <button type="button" className="pill-btn primary" onClick={() => respondRequest(r.id, 'accept')}>Accept</button>
                          <button type="button" className="pill-btn" onClick={() => respondRequest(r.id, 'reject')}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {justAccepted.length > 0 && (
                  <div className="bell-section">
                    <span className="bell-section-label">Follow back?</span>
                    {justAccepted.map((r) => (
                      <div key={r.id} className="bell-request-row">
                        <button type="button" className="people-search-person" onClick={() => { setRequestsOpen(false); navigate(`/profile/${r.id}`); }}>
                          <Avatar id={r.id} name={r.displayName} photoUrl={r.photoUrl} size={32} />
                          <span>{r.displayName}</span>
                        </button>
                        <div className="follow-request-actions">
                          {r.followBackStatus === 'accepted' ? (
                            <button type="button" className="pill-btn" disabled>Following</button>
                          ) : r.followBackStatus === 'pending' ? (
                            <button type="button" className="pill-btn" disabled>Requested</button>
                          ) : (
                            <button type="button" className="pill-btn primary" onClick={() => followBackRequest(r.id)}>Follow back</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {partnerRequests.length > 0 && (
                  <div className="bell-section">
                    <span className="bell-section-label">Accountability requests</span>
                    {partnerRequests.map((r) => (
                      <div key={r.id} className="bell-request-row">
                        <button type="button" className="people-search-person" onClick={() => { setRequestsOpen(false); navigate(`/profile/${r.id}`); }}>
                          <Avatar id={r.id} name={r.displayName} photoUrl={r.photoUrl} size={32} />
                          <span>{r.displayName}</span>
                        </button>
                        <div className="follow-request-actions">
                          <button type="button" className="pill-btn primary" onClick={() => respondPartnerRequest(r.id, 'accept')}>Accept</button>
                          <button type="button" className="pill-btn" onClick={() => respondPartnerRequest(r.id, 'reject')}>Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {notifications.length > 0 && (
                  <div className="bell-section">
                    <span className="bell-section-label">Activity</span>
                    {notifications.map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        className={`bell-notif-row${n.read ? '' : ' unread'}`}
                        onClick={() => { setRequestsOpen(false); navigate(`/profile/${n.actorId}`); }}
                      >
                        <Avatar id={n.actorId} name={n.actorName} photoUrl={n.actorPhotoUrl} size={32} />
                        <span className="bell-notif-text">{notificationText(n)}<small>{timeAgo(n.createdAt)}</small></span>
                      </button>
                    ))}
                  </div>
                )}
                {!requests.length && !justAccepted.length && !partnerRequests.length && !notifications.length && (
                  <div className="people-search-empty">Nothing new yet</div>
                )}
              </div>
            )}
          </div>
          <div className="me-wrap" ref={menuRef}>
            <button
              className="avatar-btn"
              type="button"
              title="Account menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {user ? <Avatar id={user.id} name={user.displayName} photoUrl={user.photoUrl} size={32} /> : 'Me'}
            </button>
            <span className="streak-badge" hidden={!streak}>🔥<span>{streak}</span></span>
            {menuOpen && (
              <div className="me-menu">
                <button
                  type="button"
                  className="me-menu-item"
                  onClick={() => { setMenuOpen(false); navigate(`/profile/${user?.id}`); }}
                >
                  View profile
                </button>
                <button type="button" className="me-menu-item danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="wrap">
        <nav className="category-nav">
          <button
            type="button"
            className={`cat-pill${activeCategory === 'all' ? ' active' : ''}`}
            onClick={() => handleCategoryClick('all')}
          >
            <span className="dot" style={{ color: 'var(--accent)' }} />All <span className="count">{counts.all ?? ''}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cat-pill${activeCategory === c.id ? ' active' : ''}`}
              onClick={() => handleCategoryClick(c.id)}
            >
              <span className="dot" style={{ color: `var(--${c.id})` }} />{c.emoji} {c.label} <span className="count">{counts[c.id] ?? ''}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
