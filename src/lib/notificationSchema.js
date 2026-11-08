// Keep one complete definition so startup never narrows an existing enum.
const notificationTypes = "ENUM('like','comment','follow_accepted','partner_request','partner_accepted','partner_missed','reaction')";

async function ensureNotificationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      recipient_id VARCHAR(36) NOT NULL,
      actor_id VARCHAR(36) NOT NULL,
      type ${notificationTypes} NOT NULL,
      post_id VARCHAR(36) DEFAULT NULL,
      read_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      INDEX idx_notifications_recipient (recipient_id, created_at)
    ) ENGINE=InnoDB
  `);
  await pool.query(`ALTER TABLE notifications MODIFY COLUMN type ${notificationTypes} NOT NULL`);
}

module.exports = { ensureNotificationTable };
