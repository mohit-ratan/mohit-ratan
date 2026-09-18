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
