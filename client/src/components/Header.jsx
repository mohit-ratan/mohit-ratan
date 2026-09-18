import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import Avatar from './Avatar';
import { CATEGORIES } from '../lib/format';
import { SearchIcon } from '../lib/icons';
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

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
        <div className={`search-box${searchQuery ? ' has-value' : ''}`}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search posts, people, #tags"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
          <button
            className="clear-btn"
            title="Clear search"
            aria-label="Clear search"
            onClick={() => onSearchChange?.('')}
          >
            ✕
          </button>
        </div>
        <div className="header-actions">
          <button className="pill-btn" type="button" onClick={onCompose}>+ Post</button>
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
