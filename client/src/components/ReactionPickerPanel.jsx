import { EMOJI_REACTIONS, MEME_REACTIONS } from '../lib/reactions';

// Shared by CommentReactions (reacting to an existing comment) and the
// comment composer (attaching a sticker to a new one) — one picker, one
// place to change its layout.
export default function ReactionPickerPanel({ onPick }) {
  return (
    <div className="reaction-picker">
      <div className="reaction-picker-emoji">
        {EMOJI_REACTIONS.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)}>{e}</button>
        ))}
      </div>
      <span className="reaction-picker-label">Memes</span>
      <div className="reaction-picker-memes">
        {MEME_REACTIONS.map((m) => (
          <button key={m.key} type="button" className="reaction-picker-meme" style={{ background: m.bg }} onClick={() => onPick(m.key)}>
            <span>{m.emoji}</span><small>{m.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
