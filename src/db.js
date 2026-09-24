const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'packsomework',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: false,
});

// GoDaddy Node.js Hosting's database import tool drops every existing table
// before running any uploaded .sql file, so schema.sql can't be safely
// re-imported once there's real user data. New tables are instead created
// here, idempotently, on every app start.
pool.query(`
  CREATE TABLE IF NOT EXISTS goals (
    id VARCHAR(36) PRIMARY KEY,
    author_id VARCHAR(36) NOT NULL,
    tag VARCHAR(24) NOT NULL,
    target_date DATE DEFAULT NULL,
    subtasks JSON DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_author_tag (author_id, tag),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure goals table exists:', err));

pool.query(`
  SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'visibility'
`).then(([rows]) => {
  if (!rows[0].cnt) {
    return pool.query("ALTER TABLE posts ADD COLUMN visibility ENUM('public','friends') NOT NULL DEFAULT 'friends'");
  }
}).catch((err) => console.error('Could not ensure posts.visibility column exists:', err));

pool.query(`
  SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_private'
`).then(([rows]) => {
  if (!rows[0].cnt) {
    return pool.query('ALTER TABLE users ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 1');
  }
}).catch((err) => console.error('Could not ensure users.is_private column exists:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS follows (
    follower_id VARCHAR(36) NOT NULL,
    followee_id VARCHAR(36) NOT NULL,
    status ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follows_followee_status (followee_id, status)
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure follows table exists:', err));

pool.query(`
  SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'aspect_ratio'
`).then(([rows]) => {
  if (!rows[0].cnt) {
    return pool.query("ALTER TABLE posts ADD COLUMN aspect_ratio ENUM('square','portrait','landscape') NOT NULL DEFAULT 'square'");
  }
}).catch((err) => console.error('Could not ensure posts.aspect_ratio column exists:', err));

pool.query(`
  SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'crop_x'
`).then(([rows]) => {
  if (!rows[0].cnt) {
    return pool.query('ALTER TABLE posts ADD COLUMN crop_x DECIMAL(5,2) NOT NULL DEFAULT 50, ADD COLUMN crop_y DECIMAL(5,2) NOT NULL DEFAULT 50');
  }
}).catch((err) => console.error('Could not ensure posts.crop_x/crop_y columns exist:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS blocks (
    blocker_id VARCHAR(36) NOT NULL,
    blocked_id VARCHAR(36) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure blocks table exists:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    type ENUM('like','comment','follow_accepted') NOT NULL,
    post_id VARCHAR(36) DEFAULT NULL,
    read_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_notifications_recipient (recipient_id, created_at)
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure notifications table exists:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS accountability_partners (
    id VARCHAR(36) PRIMARY KEY,
    requester_id VARCHAR(36) NOT NULL,
    partner_id VARCHAR(36) NOT NULL,
    status ENUM('pending','active') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_pair (requester_id, partner_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure accountability_partners table exists:', err));

pool.query(
  "ALTER TABLE notifications MODIFY COLUMN type ENUM('like','comment','follow_accepted','partner_request','partner_accepted','partner_missed') NOT NULL"
).catch((err) => console.error('Could not extend notifications.type enum:', err));

pool.query(
  "ALTER TABLE notifications MODIFY COLUMN type ENUM('like','comment','follow_accepted','partner_request','partner_accepted','partner_missed','reaction') NOT NULL"
).catch((err) => console.error('Could not extend notifications.type enum with reaction:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS special_awards (
    user_id VARCHAR(36) NOT NULL,
    award_id VARCHAR(40) NOT NULL,
    earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, award_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure special_awards table exists:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS streak_freeze_uses (
    user_id VARCHAR(36) NOT NULL,
    used_on DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, used_on),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure streak_freeze_uses table exists:', err));

pool.query(`
  SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'sticker'
`).then(([rows]) => {
  if (!rows[0].cnt) {
    return pool.query('ALTER TABLE comments ADD COLUMN sticker VARCHAR(20) DEFAULT NULL');
  }
}).catch((err) => console.error('Could not ensure comments.sticker column exists:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS comment_reactions (
    comment_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id, user_id, reaction),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure comment_reactions table exists:', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS post_reactions (
    post_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    reaction VARCHAR(20) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).catch((err) => console.error('Could not ensure post_reactions table exists:', err));

module.exports = pool;
