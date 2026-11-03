import { POST_CHEERS } from '../lib/reactions';

export default function CheerSummary({ cheers = [], current, onOpen }) {
  const visible = cheers.filter(item => item.count > 0 && POST_CHEERS.some(cheer => cheer.key === item.reaction));
  if (!visible.length) return null;
  return <div className="cheer-summary" aria-label="Cheers on this post" aria-live="polite">
    {visible.map(item => {
      const label = POST_CHEERS.find(cheer => cheer.key === item.reaction).label;
      const mine = current === item.reaction;
      const Tag = onOpen ? 'button' : 'span';
      return <Tag type={onOpen ? 'button' : undefined} onClick={onOpen ? () => onOpen(item.reaction) : undefined} className={`cheer-count${mine ? ' cheer-count-mine' : ''}`} key={item.reaction} title={`${label}: ${item.count}${mine ? ', including you' : ''}`} aria-label={`${label}: ${item.count}${mine ? ', including you' : ''}`}><span aria-hidden="true">{item.reaction}</span> {item.count}</Tag>;
    })}
  </div>;
}
