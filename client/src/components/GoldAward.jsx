export default function GoldAward({ earned = false, preview = false, categories = [] }) {
  return <div className={`gold-unity-award ${earned || preview ? 'gold-unity-revealed' : ''}`}>
    <div className="gold-unity-medal" role="img" aria-label="Prized gold award combining Health, Wealth and Relationships"><span>♛</span><strong>45</strong><div><i className="unity-health">✦</i><i className="unity-wealth">◆</i><i className="unity-relationships">♥</i></div></div>
    <h3>Prized Gold · Trifecta</h3><p>{preview ? 'Design preview' : earned ? 'Earned — yours to keep' : `${categories.length}/3 categories completed in the current 45-day window`}</p>
    <small>Complete at least one goal in each category within any rolling 45 days. Every task in each goal must be complete.</small>
  </div>;
}
