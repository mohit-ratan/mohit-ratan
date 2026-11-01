import { CategoryIcon, ThemeIcon } from '../lib/icons';
export default function SideColumn({ streak = 0, freezesRemaining = 0, trendingTags = [], counts = {}, onTagClick, onCategoryClick }) {
  const streakMsg = streak > 0
    ? 'Post a photo or video today to keep it going.'
    : 'Share a photo or video today to start a streak.';

  return (
    <>
      <div className="card side-card streak-card">
        <h4><ThemeIcon name="flame" /> Your streak</h4>
        <div className="streak-display"><span className="n">{streak}</span><span className="u">day{streak === 1 ? '' : 's'}</span></div>
        <div className="about-text">{streakMsg}</div>
        <div className="streak-freeze-note"><ThemeIcon name="freeze" /> {freezesRemaining} streak freeze{freezesRemaining === 1 ? '' : 's'} left this month</div>
      </div>
      <div className="card side-card">
        <h4>Trending tags</h4>
        {trendingTags.length ? (
          trendingTags.map((t) => (
            <div key={t.tag} className="trend-item" onClick={() => onTagClick?.(t.tag)}>
              <span>#{t.tag}</span><span className="n">{t.count}</span>
            </div>
          ))
        ) : (
          <div className="about-text">Tags will show up here as people post.</div>
        )}
      </div>
      <div className="card side-card">
        <h4>Community</h4>
        <button type="button" className="stat-row" onClick={() => onCategoryClick?.('health')}><span><CategoryIcon category="health" /> Health</span><b>{counts.health ?? 0}</b></button>
        <button type="button" className="stat-row" onClick={() => onCategoryClick?.('wealth')}><span><CategoryIcon category="wealth" /> Wealth</span><b>{counts.wealth ?? 0}</b></button>
        <button type="button" className="stat-row" onClick={() => onCategoryClick?.('relationships')}><span><CategoryIcon category="relationships" /> Relationships</span><b>{counts.relationships ?? 0}</b></button>
      </div>
      <div className="card side-card">
        <h4>About PackSomeWork</h4>
        <div className="about-text">A place to pack in the everyday work of a good life — body, budget, and bonds — mostly in photos and clips, a tag if you need one.</div>
      </div>
    </>
  );
}
