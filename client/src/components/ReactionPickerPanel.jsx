import { EMOJI_REACTIONS, MEME_REACTIONS } from '../lib/reactions';

// Shared by CommentReactions (reacting to an existing comment), the feed's
// quick post reaction, and the comment composer (attaching a sticker to a
// new one) — one picker, one place to change its layout.
// `current` (optional) highlights the active choice and, together with
// `onRemove`, surfaces an explicit way to undo it instead of relying on
// people re-clicking the exact same emoji.
export default function ReactionPickerPanel({ onPick, current, onRemove }) {
  return (
    <div className="reaction-picker">
      {current && onRemove && (
        <button type="button" className="reaction-picker-remove" onClick={onRemove}>
          ✕ Remove reaction
        </button>
      )}
      <div className="reaction-picker-emoji">
        {EMOJI_REACTIONS.map((e) => (
          <button key={e} type="button" className={e === current ? 'active' : ''} onClick={() => onPick(e)}>{e}</button>
        ))}
      </div>
      <span className="reaction-picker-label">Memes</span>
      <div className="reaction-picker-memes">
        {MEME_REACTIONS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`reaction-picker-meme${m.key === current ? ' active' : ''}`}
            style={{ background: m.bg }}
            onClick={() => onPick(m.key)}
          >
            <span>{m.emoji}</span><small>{m.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
