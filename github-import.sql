-- Database export
-- Generated: 2026-09-18T16:09:13.137Z
-- Tables: 7

SET FOREIGN_KEY_CHECKS = 0;

-- Table: comments
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `post_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `idx_comments_post` (`post_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: goals
DROP TABLE IF EXISTS `goals`;
CREATE TABLE `goals` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_date` date DEFAULT NULL,
  `subtasks` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_author_tag` (`author_id`,`tag`),
  CONSTRAINT `goals_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `goals` (`id`, `author_id`, `tag`, `target_date`, `subtasks`, `created_at`) VALUES
('001f37f9-a2a0-4f61-a8f5-8d2d3d225add', 'b49bf221-e1cb-4c30-8733-bdee2aba9ac6', 'weightloss', '2026-09-30 00:00:00', NULL, '2026-09-18 15:43:23');

-- Table: post_likes
DROP TABLE IF EXISTS `post_likes`;
CREATE TABLE `post_likes` (
  `post_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`post_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `post_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: posts
DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('health','wealth','relationships') COLLATE utf8mb4_unicode_ci NOT NULL,
  `vibe` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `tag` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `media_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_styled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_posts_category` (`category`),
  KEY `idx_posts_author` (`author_id`),
  KEY `idx_posts_tag` (`tag`),
  KEY `idx_posts_created` (`created_at`),
  CONSTRAINT `posts_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `posts` (`id`, `author_id`, `category`, `vibe`, `tag`, `media_url`, `media_type`, `ai_styled`, `created_at`) VALUES
('caa777c6-7f0b-4d6b-9ab6-4798468ef22e', 'b49bf221-e1cb-4c30-8733-bdee2aba9ac6', 'health', 'Noir', 'weightloss', '/assets/uploads/54bf4150-d580-433e-a7f6-9eb7b28a204b.png', 'image', 0, '2026-09-18 15:43:23');

-- Table: stories
DROP TABLE IF EXISTS `stories`;
CREATE TABLE `stories` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vibe` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `tag` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `media_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_type` enum('image','video') COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_styled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`),
  KEY `idx_stories_created` (`created_at`),
  CONSTRAINT `stories_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `stories` (`id`, `author_id`, `vibe`, `tag`, `media_url`, `media_type`, `ai_styled`, `created_at`) VALUES
('0dfad6b3-d2d9-4fe9-98a1-53da2bedaec2', 'b49bf221-e1cb-4c30-8733-bdee2aba9ac6', '', 'weight loss', '/assets/uploads/57895102-1c68-4360-a3ca-eeee15f298a8.png', 'image', 0, '2026-09-18 15:48:25');

-- Table: story_views
DROP TABLE IF EXISTS `story_views`;
CREATE TABLE `story_views` (
  `story_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`story_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `story_views_ibfk_1` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `story_views_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `story_views` (`story_id`, `user_id`) VALUES
('0dfad6b3-d2d9-4fe9-98a1-53da2bedaec2', 'b49bf221-e1cb-4c30-8733-bdee2aba9ac6');

-- Table: users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bio` varchar(220) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verification_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_expires` datetime DEFAULT NULL,
  `otp_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expires` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_verification_token` (`verification_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `email`, `password_hash`, `display_name`, `bio`, `photo_url`, `email_verified`, `verification_token`, `verification_expires`, `otp_code`, `otp_expires`, `created_at`) VALUES
('b49bf221-e1cb-4c30-8733-bdee2aba9ac6', 'iasmohit01@gmail.com', '$2a$12$JewDQu4uzKe9GA8/ILVoxeKeVEUl5N15nDeWF2L6Q7bLs3u5hb/bu', 'Mohit', '', '/assets/uploads/957708c6-6015-4144-bb23-625a83c4195a.jpeg', 1, NULL, NULL, NULL, NULL, '2026-09-18 03:30:21'),
('f80c7514-725e-469f-adf8-6b54933c9f51', 'mohit.mummidi@gmail.com', '$2a$12$/EkIb.miNmZwWcZbOiJ2outmeE001BzB3sJrtuK7Mn1EwSn0Owxg6', 'Mohit2', '', NULL, 1, NULL, NULL, NULL, NULL, '2026-09-18 16:07:14');

SET FOREIGN_KEY_CHECKS = 1;
-- EXPORT COMPLETE
