const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

async function notify(recipientId, actorId, type, postId = null) {
  if (recipientId === actorId) return; // never notify yourself
  await pool.query(
    'INSERT INTO notifications (id, recipient_id, actor_id, type, post_id) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), recipientId, actorId, type, postId]
  );
}

module.exports = { notify };
