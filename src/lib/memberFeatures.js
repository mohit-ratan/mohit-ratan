const pool = require('../db');
let ready;
function ensureMemberTables() {
  if (!ready) ready = (async () => {
    const statements = [
      `CREATE TABLE IF NOT EXISTS member_preferences (
        user_id VARCHAR(36) PRIMARY KEY, time_zone VARCHAR(80) NOT NULL DEFAULT 'UTC',
        reminder_enabled TINYINT NOT NULL DEFAULT 0, reminder_time CHAR(5) NOT NULL DEFAULT '19:00',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS task_checkins (
        post_id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, goal_tag VARCHAR(24) NOT NULL,
        task_id VARCHAR(80) NOT NULL, category VARCHAR(20) NOT NULL, day_key CHAR(10) NOT NULL,
        occurred_ms BIGINT NOT NULL, goal_completed TINYINT NOT NULL DEFAULT 0,
        INDEX idx_checkins_user (user_id, occurred_ms),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS category_consistency (
        user_id VARCHAR(36) NOT NULL, category VARCHAR(20) NOT NULL, best_streak INT NOT NULL DEFAULT 0,
        earned_at DATETIME DEFAULT NULL, PRIMARY KEY (user_id, category),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS reminder_deliveries (
        user_id VARCHAR(36) NOT NULL, day_key CHAR(10) NOT NULL, status VARCHAR(20) NOT NULL,
        PRIMARY KEY (user_id, day_key), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS journal_entries (
        id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, post_id VARCHAR(36) DEFAULT NULL,
        note TEXT NOT NULL, media_key VARCHAR(255) DEFAULT NULL, created_ms BIGINT NOT NULL,
        INDEX idx_journal_user (user_id, created_ms), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL) ENGINE=InnoDB`,
    ];
    for (const sql of statements) await pool.query(sql);
  })().catch(err => { ready = null; throw err; });
  return ready;
}
async function recordCheckIn(db, { postId, userId, tag, task, category, goalCompleted }) {
  await db.query('INSERT INTO task_checkins (post_id,user_id,goal_tag,task_id,category,day_key,occurred_ms,goal_completed) VALUES (?,?,?,?,?,?,?,?)',
    [postId, userId, tag, task.id, category, task.lastProgressDate, Date.now(), goalCompleted ? 1 : 0]);
  await db.query(`INSERT INTO category_consistency (user_id,category,best_streak,earned_at) VALUES (?,?,?,IF(? >= 7,NOW(),NULL))
    ON DUPLICATE KEY UPDATE best_streak=GREATEST(best_streak,VALUES(best_streak)), earned_at=COALESCE(earned_at,VALUES(earned_at))`, [userId,category,task.streakDays,task.streakDays]);
}
module.exports = { ensureMemberTables, recordCheckIn };
