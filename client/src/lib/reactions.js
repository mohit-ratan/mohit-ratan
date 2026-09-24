// Kept in sync by hand with src/lib/reactions.js on the backend, which
// validates against the same exact keys. Meme reactions are an original,
// bundled sticker set (bold color + caption), not real-world meme images —
// nothing scraped, searched, or user-uploaded.
export const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

export const MEME_REACTIONS = [
  { key: 'meme:dead', emoji: '💀', label: 'DEAD', bg: '#1f1f1f' },
  { key: 'meme:facts', emoji: '💯', label: 'FACTS', bg: '#0b7a3d' },
  { key: 'meme:bruh', emoji: '😳', label: 'BRUH', bg: '#7a4a0b' },
  { key: 'meme:crying', emoji: '😭', label: 'CRYING', bg: '#2952a3' },
  { key: 'meme:redflag', emoji: '🚩', label: 'RED FLAG', bg: '#a32929' },
  { key: 'meme:popcorn', emoji: '🍿', label: 'WATCHING', bg: '#7a5c0b' },
  { key: 'meme:respect', emoji: '🫡', label: 'RESPECT', bg: '#4a4a4a' },
  { key: 'meme:goated', emoji: '🐐', label: 'GOATED', bg: '#5c0b7a' },
];

const MEME_BY_KEY = Object.fromEntries(MEME_REACTIONS.map((m) => [m.key, m]));

export function isMemeReaction(key) {
  return key.startsWith('meme:');
}

export function memeReaction(key) {
  return MEME_BY_KEY[key];
}
