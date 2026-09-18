import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import Avatar from './Avatar';
import api from '../api';
import { CATEGORIES } from '../lib/format';
import { SearchIcon, BellIcon } from '../lib/icons';
import { useAuth } from '../context/AuthContext';

export default function Header({
  activeCategory = 'all',
  onCategoryChange,
  counts = {},
  searchQuery = '',
  onSearchChange,
  onCompose,
  streak = 0,
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [people, setPeople] = useState([]);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [requests, setRequests] = useState([]);
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
  // app — good enough for a personal-scale follow-request inbox.
  useEffect(() => {
    let cancelled = false;
    function load() {
      api.get('/api/follows/requests').then(({ data }) => {
        if (!cancelled) setRequests(data.requests);
      }).catch(() => {});
    }
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  async function respondRequest(id, action) {
    try {
      await api.patch(`/api/follows/${id}`, { action });
      setRequests((current) => current.filter((r) => r.id !== id));
    } catch {
      // Leaving the request in the list lets the user just try again.
    }
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
    const q = searchQuery.trim();
    if (!q) { setPeople([]); setPeopleLoading(false); return; }
    setPeopleLoading(true);
    const timer = setTimeout(() => {
      api.get('/api/users/search', { params: { q } })
        .then(({ data }) => setPeople(data.users))
        .catch(() => setPeople([]))
        .finally(() => setPeopleLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function sendFollowRequest(id) {
    try {
      const { data } = await api.post(`/api/follows/${id}`);
      setPeople((current) => current.map((p) => (p.id === id ? { ...p, followStatus: data.status } : p)));
    } catch {
      // Surfacing this inline would need a toast wired into Header; a silent
      // no-op leaves the button in its prior state, which the user can retry.
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
        <div className="brand" title="Home" onClick={() => navigate('/')}>
          <BrandLogo />
          <span className="brand-mark">PackSomeWork</span>
        </div>
        <span className="brand-tag">health · wealth · relationships</span>
        <div className={`search-box${searchQuery ? ' has-value' : ''}`} ref={searchBoxRef}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search posts, people, #tags"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => { onSearchChange?.(e.target.value); setPeopleOpen(true); }}
            onFocus={() => setPeopleOpen(true)}
          />
          <button
            className="clear-btn"
            title="Clear search"
            aria-label="Clear search"
            onClick={() => onSearchChange?.('')}
          >
            ✕
          </button>
          {peopleOpen && searchQuery.trim() && (
            <div className="people-search-dropdown">
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
                <div className="people-search-empty">No people found for "{searchQuery.trim()}"</div>
              )}
            </div>
          )}
        </div>
        <div className="header-actions">
          <button className="pill-btn" type="button" onClick={onCompose}>+ Post</button>
          <div className="bell-wrap" ref={requestsRef}>
            <button
              className="bell-btn"
              type="button"
              title="Follow requests"
              aria-label="Follow requests"
              onClick={() => setRequestsOpen((v) => !v)}
            >
              <BellIcon />
              {requests.length > 0 && <span className="bell-badge">{requests.length}</span>}
            </button>
            {requestsOpen && (
              <div className="me-menu bell-menu">
                {requests.length ? requests.map((r) => (
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
                )) : (
                  <div className="people-search-empty">No follow requests</div>
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
