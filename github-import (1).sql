-- Database export
-- Generated: 2026-09-18T16:14:28.024Z
-- Tables: 1

SET FOREIGN_KEY_CHECKS = 0;

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
