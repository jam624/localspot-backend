-- 001_initial_schema.sql
-- LocalSpot Initial Database Schema Migration

CREATE TABLE IF NOT EXISTS `admins` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(180) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('super_admin', 'admin', 'moderator') NOT NULL DEFAULT 'admin',
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_admins_role` (`role`),
  INDEX `idx_admins_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_accounts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_name` VARCHAR(180) NOT NULL,
  `owner_name` VARCHAR(140) NOT NULL,
  `email` VARCHAR(180) UNIQUE NOT NULL,
  `phone` VARCHAR(40) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `email_verified_at` DATETIME NULL,
  `last_login_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_business_accounts_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(140) UNIQUE NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(120) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_categories_is_active` (`is_active`),
  INDEX `idx_categories_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `businesses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `account_id` BIGINT UNSIGNED NULL,
  `category_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(220) UNIQUE NOT NULL,
  `description` TEXT NULL,
  `phone` VARCHAR(40) NULL,
  `whatsapp` VARCHAR(40) NULL,
  `email` VARCHAR(180) NULL,
  `website` VARCHAR(255) NULL,
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(120) NOT NULL DEFAULT 'Port Harcourt',
  `area` VARCHAR(120) NULL,
  `state` VARCHAR(120) NULL,
  `country` VARCHAR(120) NOT NULL DEFAULT 'Nigeria',
  `latitude` DECIMAL(10, 7) NULL,
  `longitude` DECIMAL(10, 7) NULL,
  `price_range` TINYINT UNSIGNED NULL,
  `average_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  `review_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_featured` BOOLEAN NOT NULL DEFAULT false,
  `listing_status` ENUM('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'published', 'active', 'inactive', 'suspended') NOT NULL DEFAULT 'draft',
  `rejection_reason` TEXT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `approved_at` DATETIME NULL,
  `published_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_businesses_account_id` (`account_id`),
  INDEX `idx_businesses_category_status` (`category_id`, `listing_status`),
  INDEX `idx_businesses_location` (`city`, `area`),
  INDEX `idx_businesses_coordinates` (`latitude`, `longitude`),
  INDEX `idx_businesses_is_featured` (`is_featured`),
  FULLTEXT KEY `ft_businesses_search` (`name`, `description`, `area`, `city`),
  CONSTRAINT `fk_businesses_account` FOREIGN KEY (`account_id`) REFERENCES `business_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_businesses_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_businesses_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_categories` (
  `business_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`business_id`, `category_id`),
  CONSTRAINT `fk_bc_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bc_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_hours` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `day_of_week` TINYINT UNSIGNED NOT NULL COMMENT '0=Sunday, 1=Monday ... 6=Saturday',
  `opens_at` TIME NULL,
  `closes_at` TIME NULL,
  `is_closed` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_business_hours_day` (`business_id`, `day_of_week`),
  CONSTRAINT `fk_business_hours_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_services` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(12, 2) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_business_services_business` (`business_id`),
  CONSTRAINT `fk_business_services_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `amenities` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(140) UNIQUE NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_amenities` (
  `business_id` BIGINT UNSIGNED NOT NULL,
  `amenity_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`business_id`, `amenity_id`),
  CONSTRAINT `fk_ba_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ba_amenity` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `slug` VARCHAR(220) UNIQUE NOT NULL,
  `description` TEXT NULL,
  `discount_label` VARCHAR(80) NULL,
  `image_url` VARCHAR(500) NULL,
  `starts_at` DATETIME NULL,
  `ends_at` DATETIME NULL,
  `status` ENUM('draft', 'pending_approval', 'approved', 'rejected', 'active', 'expired', 'disabled') NOT NULL DEFAULT 'draft',
  `rejection_reason` TEXT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `approved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_promotions_business_status` (`business_id`, `status`),
  INDEX `idx_promotions_dates` (`starts_at`, `ends_at`),
  CONSTRAINT `fk_promotions_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_promotions_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `featured_listing_requests` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NULL,
  `placement` VARCHAR(120) NOT NULL DEFAULT 'homepage_featured',
  `requested_start_date` DATE NULL,
  `requested_end_date` DATE NULL,
  `status` ENUM('requested', 'pending_approval', 'approved', 'rejected', 'active', 'expired', 'disabled') NOT NULL DEFAULT 'requested',
  `rejection_reason` TEXT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `approved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_featured_business_status` (`business_id`, `status`),
  INDEX `idx_featured_category` (`category_id`),
  CONSTRAINT `fk_featured_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_featured_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_featured_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `advertisement_types` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(80) UNIQUE NOT NULL,
  `name` VARCHAR(140) NOT NULL,
  `description` TEXT NULL,
  `base_price` DECIMAL(12, 2) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `advertisement_slots` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `type_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(100) UNIQUE NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `placement` VARCHAR(160) NOT NULL,
  `max_active_campaigns` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ad_slots_type` FOREIGN KEY (`type_id`) REFERENCES `advertisement_types` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `advertisements` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `slot_id` BIGINT UNSIGNED NOT NULL,
  `target_category_id` BIGINT UNSIGNED NULL,
  `target_location` VARCHAR(120) NULL,
  `title` VARCHAR(180) NOT NULL,
  `body` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `destination_url` VARCHAR(500) NULL,
  `starts_at` DATETIME NULL,
  `ends_at` DATETIME NULL,
  `budget` DECIMAL(12, 2) NULL,
  `status` ENUM('draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'scheduled', 'active', 'paused', 'expired', 'disabled') NOT NULL DEFAULT 'draft',
  `rejection_reason` TEXT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `approved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_ads_business_status` (`business_id`, `status`),
  INDEX `idx_ads_slot_status_dates` (`slot_id`, `status`, `starts_at`, `ends_at`),
  INDEX `idx_ads_target_category` (`target_category_id`),
  CONSTRAINT `fk_ads_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ads_slot` FOREIGN KEY (`slot_id`) REFERENCES `advertisement_slots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ads_target_category` FOREIGN KEY (`target_category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ads_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_media` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `promotion_id` BIGINT UNSIGNED NULL,
  `advertisement_id` BIGINT UNSIGNED NULL,
  `media_type` ENUM('logo', 'cover', 'gallery', 'advertisement', 'promotion') NOT NULL DEFAULT 'gallery',
  `url` VARCHAR(500) NOT NULL,
  `alt_text` VARCHAR(180) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_business_media_business_type` (`business_id`, `media_type`),
  CONSTRAINT `fk_business_media_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_business_media_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_business_media_advertisement` FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `event_type` ENUM(
    'business_view',
    'search',
    'phone_click',
    'whatsapp_click',
    'website_click',
    'directions_click',
    'favorite_add',
    'favorite_remove',
    'business_share',
    'advertisement_impression',
    'advertisement_click',
    'promotion_view'
  ) NOT NULL,
  `business_id` BIGINT UNSIGNED NULL,
  `advertisement_id` BIGINT UNSIGNED NULL,
  `promotion_id` BIGINT UNSIGNED NULL,
  `category_id` BIGINT UNSIGNED NULL,
  `search_query` VARCHAR(255) NULL,
  `platform` VARCHAR(80) NULL,
  `visitor_id` VARCHAR(120) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `referrer` VARCHAR(500) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_events_type_date` (`event_type`, `created_at`),
  INDEX `idx_events_business_date` (`business_id`, `created_at`),
  INDEX `idx_events_ad_date` (`advertisement_id`, `created_at`),
  INDEX `idx_events_promotion_date` (`promotion_id`, `created_at`),
  CONSTRAINT `fk_events_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_events_advertisement` FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_events_promotion` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_events_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `revenue_transactions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `advertisement_id` BIGINT UNSIGNED NULL,
  `featured_listing_request_id` BIGINT UNSIGNED NULL,
  `transaction_type` ENUM('advertisement', 'featured_listing', 'promotion_boost', 'manual') NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'NGN',
  `payment_provider` VARCHAR(80) NULL,
  `provider_reference` VARCHAR(180) NULL,
  `status` ENUM('requested', 'pending_review', 'pending_payment', 'paid', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'requested',
  `paid_at` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_revenue_business_status` (`business_id`, `status`),
  INDEX `idx_revenue_created_at` (`created_at`),
  CONSTRAINT `fk_revenue_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_revenue_advertisement` FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_revenue_featured` FOREIGN KEY (`featured_listing_request_id`) REFERENCES `featured_listing_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `account_type` ENUM('business', 'admin') NOT NULL,
  `business_account_id` BIGINT UNSIGNED NULL,
  `admin_id` BIGINT UNSIGNED NULL,
  `token_hash` VARCHAR(255) UNIQUE NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_password_reset_expires` (`expires_at`),
  CONSTRAINT `fk_password_reset_business` FOREIGN KEY (`business_account_id`) REFERENCES `business_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_password_reset_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
