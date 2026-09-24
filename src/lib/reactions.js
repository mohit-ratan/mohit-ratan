// Kept in sync by hand with client/src/lib/reactions.js — plain emoji
// characters, plus a curated 'meme:<key>' sticker set (see that file for
// what each renders as). Never free text: reactions are validated against
// this exact list server-side regardless of what the client sends.
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];
const MEME_REACTIONS = ['meme:dead', 'meme:facts', 'meme:bruh', 'meme:crying', 'meme:redflag', 'meme:popcorn', 'meme:respect', 'meme:goated'];
const ALLOWED_REACTIONS = new Set([...EMOJI_REACTIONS, ...MEME_REACTIONS]);

module.exports = { ALLOWED_REACTIONS };
