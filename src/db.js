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

module.exports = pool;
