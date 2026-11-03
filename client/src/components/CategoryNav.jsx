import { CATEGORIES } from '../lib/format';
import { CategoryIcon } from '../lib/icons';

export default function CategoryNav({ activeCategory = 'all', counts = {}, onCategoryChange }) {
  return (
        <nav className="category-nav" aria-label="Filter by category">
          <button
            type="button"
            className={`cat-pill${activeCategory === 'all' ? ' active' : ''}`}
            aria-pressed={activeCategory === 'all'}
            onClick={() => onCategoryChange('all')}
          >
            <span className="dot" style={{ color: 'var(--accent)' }} />All <span className="count">{counts.all ?? ''}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cat-pill cat-icon${activeCategory === c.id ? ' active' : ''}`}
              aria-label={c.label}
              aria-pressed={activeCategory === c.id}
              onClick={() => onCategoryChange(c.id)}
            >
              <CategoryIcon category={c.id} />
            </button>
          ))}
        </nav>
  );
}
