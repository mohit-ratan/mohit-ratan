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
  const { user } = useAuth();

  function handleCategoryClick(id) {
    if (onCategoryChange) onCategoryChange(id);
    else navigate(id === 'all' ? '/' : `/?category=${id}`);
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
          <div className="me-wrap">
            <button
              className="avatar-btn"
              type="button"
              title="Your profile"
              onClick={() => navigate(`/profile/${user?.id}`)}
            >
              {user ? <Avatar id={user.id} name={user.displayName} photoUrl={user.photoUrl} size={32} /> : 'Me'}
            </button>
            <span className="streak-badge" hidden={!streak}>🔥<span>{streak}</span></span>
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
