export default function SideColumn({ streak = 0, trendingTags = [], counts = {}, onTagClick, onCategoryClick }) {
  const streakMsg = streak > 0
    ? 'Post a photo or video today to keep it going.'
    : 'Share a photo or video today to start a streak.';

  return (
    <>
      <div className="card side-card streak-card">
        <h4>🔥 Your streak</h4>
        <div className="streak-display"><span className="n">{streak}</span><span className="u">day{streak === 1 ? '' : 's'}</span></div>
        <div className="about-text">{streakMsg}</div>
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
        <button type="button" className="stat-row" onClick={() => onCategoryClick?.('health')}><span>🌿 Health</span><b>{counts.health ?? 0}</b></button>
        <button type="button" className="stat-row" onClick={() => onCategoryClick?.('wealth')}><span>💰 Wealth</span><b>{counts.wealth ?? 0}</b></button>
        <button type="button" className="stat-row" onClick={() => onCategoryClick?.('relationships')}><span>❤️ Relationships</span><b>{counts.relationships ?? 0}</b></button>
      </div>
      <div className="card side-card">
        <h4>About PackSomeWork</h4>
        <div className="about-text">A place to pack in the everyday work of a good life — body, budget, and bonds — mostly in photos and clips, a tag if you need one.</div>
      </div>
    </>
  );
}
