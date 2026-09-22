-- PackSomeWork database schema (MySQL 8+)
-- Assumes the target database already exists and is selected — create it
-- first (see README), then: mysql -u root -p your_db_name < schema.sql
-- (works as-is with hosted/managed MySQL import tools too, which already
-- run against a pre-provisioned database rather than one named here).

CREATE TABLE IF NOT EXISTS users (
  id                    VARCHAR(36)  PRIMARY KEY,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         VARCHAR(255) NOT NULL,
  display_name          VARCHAR(100) NOT NULL,
  bio                   VARCHAR(220) DEFAULT '',
  photo_url             VARCHAR(500) DEFAULT NULL,
  is_private            TINYINT(1)  NOT NULL DEFAULT 1,
  email_verified         TINYINT(1)  NOT NULL DEFAULT 0,
  verification_token    VARCHAR(255) DEFAULT NULL,
  verification_expires  DATETIME     DEFAULT NULL,
  otp_code              VARCHAR(10)  DEFAULT NULL,
  otp_expires           DATETIME     DEFAULT NULL,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_verification_token (verification_token)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id           VARCHAR(36) PRIMARY KEY,
  author_id    VARCHAR(36) NOT NULL,
  category     ENUM('health','wealth','relationships') NOT NULL,
  vibe         VARCHAR(60)  DEFAULT '',
  tag          VARCHAR(24)  DEFAULT '',
  media_url    VARCHAR(500) NOT NULL,
  media_type   ENUM('image','video') NOT NULL,
  ai_styled    TINYINT(1)   NOT NULL DEFAULT 0,
  visibility   ENUM('public','friends') NOT NULL DEFAULT 'friends',
  aspect_ratio ENUM('square','portrait','landscape') NOT NULL DEFAULT 'square',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_posts_category (category),
  INDEX idx_posts_author (author_id),
  INDEX idx_posts_tag (tag),
  INDEX idx_posts_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id  VARCHAR(36) NOT NULL,
  user_id  VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS comments (
  id          VARCHAR(36) PRIMARY KEY,
  post_id     VARCHAR(36) NOT NULL,
  author_id   VARCHAR(36) NOT NULL,
  text        VARCHAR(500) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comments_post (post_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stories (
  id           VARCHAR(36) PRIMARY KEY,
  author_id    VARCHAR(36) NOT NULL,
  vibe         VARCHAR(60)  DEFAULT '',
  tag          VARCHAR(24)  DEFAULT '',
  media_url    VARCHAR(500) NOT NULL,
  media_type   ENUM('image','video') NOT NULL,
  ai_styled    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stories_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS story_views (
  story_id  VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (story_id, user_id),
  FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Optional deadline + subtask checklist attached to an achievement (a
-- user's tag), set only when that tag is first used. "Completed" is
-- derived (all subtasks done), never stored.
CREATE TABLE IF NOT EXISTS goals (
  id            VARCHAR(36) PRIMARY KEY,
  author_id     VARCHAR(36) NOT NULL,
  tag           VARCHAR(24) NOT NULL,
  target_date   DATE DEFAULT NULL,
  subtasks      JSON DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_author_tag (author_id, tag),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Every account is private by default: a follower can only see someone's
-- posts/stories/achievements once that person accepts the follow request.
CREATE TABLE IF NOT EXISTS follows (
  follower_id   VARCHAR(36) NOT NULL,
  followee_id   VARCHAR(36) NOT NULL,
  status        ENUM('pending','accepted') NOT NULL DEFAULT 'pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_follows_followee_status (followee_id, status)
) ENGINE=InnoDB;

-- A block is one-directional to record who initiated it, but visibility
-- and follow checks treat it as mutual (see src/lib/blocks.js).
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id  VARCHAR(36) NOT NULL,
  blocked_id  VARCHAR(36) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Two users pairing up on staying consistent — accepting turns a pending
-- request into 'active'; either side can end it, which deletes the row
-- (same pattern as unfollow), so there's no 'ended' state to track.
CREATE TABLE IF NOT EXISTS accountability_partners (
  id            VARCHAR(36) PRIMARY KEY,
  requester_id  VARCHAR(36) NOT NULL,
  partner_id    VARCHAR(36) NOT NULL,
  status        ENUM('pending','active') NOT NULL DEFAULT 'pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pair (requester_id, partner_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id            VARCHAR(36) PRIMARY KEY,
  recipient_id  VARCHAR(36) NOT NULL,
  actor_id      VARCHAR(36) NOT NULL,
  type          ENUM('like','comment','follow_accepted','partner_request','partner_accepted','partner_missed') NOT NULL,
  post_id       VARCHAR(36) DEFAULT NULL,
  read_at       DATETIME DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_notifications_recipient (recipient_id, created_at)
) ENGINE=InnoDB;

-- A day a streak freeze covered a missed day — on top of the streak
-- calculation's existing unconditional one-day grace period. Auto-consumed
-- (up to STREAK_FREEZE_MONTHLY_LIMIT per calendar month) the first time a
-- gap is detected, then permanent, so re-checking the streak later doesn't
-- re-spend or un-spend it.
-- Cross-category awards that don't belong to any single goal — right now
-- just the SuperPack Award (award_id = 'superpack'), earned the first time a
-- member has a completed goal in all three categories at once. Recorded
-- permanently (INSERT IGNORE) so it's granted exactly once, even though
-- the underlying condition is re-checked on every relevant goal completion.
CREATE TABLE IF NOT EXISTS special_awards (
  user_id     VARCHAR(36) NOT NULL,
  award_id    VARCHAR(40) NOT NULL,
  earned_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, award_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS streak_freeze_uses (
  user_id     VARCHAR(36) NOT NULL,
  used_on     DATE NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, used_on),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
