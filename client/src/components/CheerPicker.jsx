import { POST_CHEERS } from '../lib/reactions';

export default function CheerPicker({ current, onPick, onRemove }) {
  return <div className="cheer-picker" role="group" aria-label="Choose a cheer">
    <h3>A little encouragement</h3>
    <div className="cheer-picker-grid">{POST_CHEERS.map(cheer => <button type="button" key={cheer.key} aria-pressed={current === cheer.key} onClick={() => onPick(cheer.key)}><span aria-hidden="true">{cheer.key}</span>{cheer.label}</button>)}</div>
    {current && <button type="button" className="cheer-remove" onClick={onRemove}>Remove your cheer</button>}
  </div>;
}
