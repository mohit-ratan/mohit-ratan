const pool = require('../db');
const { getFollowStatus } = require('./follows');
const { isBlocked } = require('./blocks');

async function canViewPost(viewerId, postId) {
  const [rows] = await pool.query('SELECT author_id, visibility FROM posts WHERE id = ?', [postId]);
  const post = rows[0];
  if (!post) return false;
  if (post.author_id === viewerId) return true;
  if (await isBlocked(viewerId, post.author_id)) return false;
  return post.visibility === 'public' || await getFollowStatus(viewerId, post.author_id) === 'accepted';
}
module.exports = { canViewPost };
