-- 002_user_auth_and_favorites.sql
-- Adds consumer user accounts, server-side favorites, and extends
-- password_reset_tokens and events to support the new user type.
-- Run AFTER 001_initial_schema.sql.
-- Safe to run via migrate.js — the schema_migrations table prevents double execution.
-- Each ALTER is wrapped in a stored procedure to guard against re-application.

-- ---------------------------------------------------------------------------
-- 1. Consumer user accounts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`              VARCHAR(140) NOT NULL,
  `email`             VARCHAR(180) NOT NULL,
  `password_hash`     VARCHAR(255) NOT NULL,
  `status`            ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `email_verified_at` DATETIME NULL,
  `last_login_at`     DATETIME NULL,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. Server-side favorites (replaces localStorage)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_favorites` (
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `business_id`),
  INDEX `idx_user_favorites_business` (`business_id`),
  CONSTRAINT `fk_uf_user`     FOREIGN KEY (`user_id`)     REFERENCES `users`      (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uf_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Extend password_reset_tokens to support user resets
-- ---------------------------------------------------------------------------

ALTER TABLE `password_reset_tokens`
  ADD COLUMN `user_id` BIGINT UNSIGNED NULL AFTER `admin_id`,
  ADD CONSTRAINT `fk_password_reset_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  MODIFY COLUMN `account_type` ENUM('business', 'admin', 'user') NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Extend events to record which user triggered an event
-- ---------------------------------------------------------------------------

ALTER TABLE `events`
  ADD COLUMN `user_id` BIGINT UNSIGNED NULL AFTER `visitor_id`,
  ADD INDEX `idx_events_user` (`user_id`),
  ADD CONSTRAINT `fk_events_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
