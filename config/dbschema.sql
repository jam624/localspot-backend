CREATE TABLE `admins` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(180) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(30) NOT NULL DEFAULT 'admin',
  `is_active` boolean NOT NULL DEFAULT true,
  `last_login_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `business_accounts` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `owner_name` varchar(140) NOT NULL,
  `email` varchar(180) UNIQUE NOT NULL,
  `phone` varchar(40) UNIQUE NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `email_verified_at` datetime,
  `last_login_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `categories` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) UNIQUE NOT NULL,
  `description` text,
  `icon` varchar(120),
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `businesses` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `account_id` bigint,
  `name` varchar(180) NOT NULL,
  `slug` varchar(220) UNIQUE NOT NULL,
  `description` text,
  `phone` varchar(40),
  `whatsapp` varchar(40),
  `email` varchar(180),
  `website` varchar(255),
  `address` varchar(255),
  `city` varchar(120) NOT NULL DEFAULT 'Port Harcourt',
  `area` varchar(120),
  `state` varchar(120),
  `country` varchar(120) NOT NULL DEFAULT 'Nigeria',
  `latitude` decimal(10,7),
  `longitude` decimal(10,7),
  `price_range` tinyint,
  `average_rating` decimal(3,2) NOT NULL DEFAULT 0,
  `review_count` int NOT NULL DEFAULT 0,
  `is_featured` boolean NOT NULL DEFAULT false,
  `listing_status` varchar(30) NOT NULL DEFAULT 'draft',
  `rejection_reason` text,
  `approved_by` bigint,
  `approved_at` datetime,
  `published_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `business_categories` (
  `business_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (`business_id`, `category_id`)
);

CREATE TABLE `business_hours` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `day_of_week` tinyint NOT NULL COMMENT '0=Sunday, 1=Monday ... 6=Saturday',
  `opens_at` time,
  `closes_at` time,
  `is_closed` boolean NOT NULL DEFAULT false,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `business_services` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `name` varchar(160) NOT NULL,
  `description` text,
  `price` decimal(12,2),
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `amenities` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) UNIQUE NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `business_amenities` (
  `business_id` bigint NOT NULL,
  `amenity_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (`business_id`, `amenity_id`)
);

CREATE TABLE `business_media` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `media_type` varchar(30) NOT NULL DEFAULT 'gallery',
  `url` varchar(500) NOT NULL,
  `alt_text` varchar(180),
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `promotions` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `title` varchar(180) NOT NULL,
  `slug` varchar(220) UNIQUE NOT NULL,
  `description` text,
  `discount_label` varchar(80),
  `starts_at` datetime,
  `ends_at` datetime,
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `rejection_reason` text,
  `approved_by` bigint,
  `approved_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `featured_listing_requests` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `placement` varchar(120) NOT NULL DEFAULT 'homepage_featured',
  `requested_start_date` date,
  `requested_end_date` date,
  `status` varchar(30) NOT NULL DEFAULT 'requested',
  `rejection_reason` text,
  `approved_by` bigint,
  `approved_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `advertisement_types` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(80) UNIQUE NOT NULL,
  `name` varchar(140) NOT NULL,
  `description` text,
  `base_price` decimal(12,2),
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `advertisement_slots` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `type_id` bigint NOT NULL,
  `code` varchar(100) UNIQUE NOT NULL,
  `name` varchar(160) NOT NULL,
  `placement` varchar(160) NOT NULL,
  `max_active_campaigns` int NOT NULL DEFAULT 1,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `advertisements` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `slot_id` bigint NOT NULL,
  `title` varchar(180) NOT NULL,
  `body` text,
  `image_url` varchar(500),
  `destination_url` varchar(500),
  `starts_at` datetime,
  `ends_at` datetime,
  `budget` decimal(12,2),
  `status` varchar(30) NOT NULL DEFAULT 'draft',
  `rejection_reason` text,
  `approved_by` bigint,
  `approved_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `events` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `event_type` varchar(50) NOT NULL,
  `business_id` bigint,
  `advertisement_id` bigint,
  `promotion_id` bigint,
  `category_id` bigint,
  `search_query` varchar(255),
  `platform` varchar(80),
  `visitor_id` varchar(120),
  `ip_address` varchar(45),
  `user_agent` varchar(500),
  `referrer` varchar(500),
  `metadata` json,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `revenue_transactions` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `business_id` bigint NOT NULL,
  `advertisement_id` bigint,
  `featured_listing_request_id` bigint,
  `transaction_type` varchar(40) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'NGN',
  `payment_provider` varchar(80),
  `provider_reference` varchar(180),
  `status` varchar(30) NOT NULL DEFAULT 'requested',
  `paid_at` datetime,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  `updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `password_reset_tokens` (
  `id` bigint PRIMARY KEY AUTO_INCREMENT,
  `account_type` varchar(20) NOT NULL,
  `business_account_id` bigint,
  `admin_id` bigint,
  `token_hash` varchar(255) UNIQUE NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime,
  `created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE INDEX `admins_index_0` ON `admins` (`role`);

CREATE INDEX `admins_index_1` ON `admins` (`is_active`);

CREATE INDEX `business_accounts_index_2` ON `business_accounts` (`status`);

CREATE INDEX `categories_index_3` ON `categories` (`is_active`);

CREATE INDEX `categories_index_4` ON `categories` (`sort_order`);

CREATE INDEX `businesses_index_5` ON `businesses` (`account_id`);

CREATE INDEX `businesses_index_6` ON `businesses` (`listing_status`);

CREATE INDEX `businesses_index_7` ON `businesses` (`city`);

CREATE INDEX `businesses_index_8` ON `businesses` (`area`);

CREATE INDEX `businesses_index_9` ON `businesses` (`city`, `area`);

CREATE INDEX `businesses_index_10` ON `businesses` (`is_featured`, `listing_status`);

CREATE INDEX `business_categories_index_11` ON `business_categories` (`category_id`);

CREATE UNIQUE INDEX `business_hours_index_12` ON `business_hours` (`business_id`, `day_of_week`);

CREATE INDEX `business_services_index_13` ON `business_services` (`business_id`);

CREATE INDEX `business_services_index_14` ON `business_services` (`business_id`, `is_active`);

CREATE INDEX `amenities_index_15` ON `amenities` (`name`);

CREATE INDEX `business_amenities_index_16` ON `business_amenities` (`amenity_id`);

CREATE INDEX `business_media_index_17` ON `business_media` (`business_id`, `media_type`);

CREATE INDEX `business_media_index_18` ON `business_media` (`business_id`, `sort_order`);

CREATE INDEX `promotions_index_19` ON `promotions` (`business_id`);

CREATE INDEX `promotions_index_20` ON `promotions` (`status`);

CREATE INDEX `promotions_index_21` ON `promotions` (`business_id`, `status`);

CREATE INDEX `promotions_index_22` ON `promotions` (`starts_at`, `ends_at`);

CREATE INDEX `featured_listing_requests_index_23` ON `featured_listing_requests` (`business_id`);

CREATE INDEX `featured_listing_requests_index_24` ON `featured_listing_requests` (`status`);

CREATE INDEX `featured_listing_requests_index_25` ON `featured_listing_requests` (`business_id`, `status`);

CREATE INDEX `featured_listing_requests_index_26` ON `featured_listing_requests` (`requested_start_date`, `requested_end_date`);

CREATE INDEX `advertisement_slots_index_27` ON `advertisement_slots` (`type_id`);

CREATE INDEX `advertisement_slots_index_28` ON `advertisement_slots` (`placement`);

CREATE INDEX `advertisements_index_29` ON `advertisements` (`business_id`);

CREATE INDEX `advertisements_index_30` ON `advertisements` (`slot_id`);

CREATE INDEX `advertisements_index_31` ON `advertisements` (`status`);

CREATE INDEX `advertisements_index_32` ON `advertisements` (`business_id`, `status`);

CREATE INDEX `advertisements_index_33` ON `advertisements` (`slot_id`, `status`);

CREATE INDEX `advertisements_index_34` ON `advertisements` (`starts_at`, `ends_at`);

CREATE INDEX `events_index_35` ON `events` (`event_type`);

CREATE INDEX `events_index_36` ON `events` (`business_id`);

CREATE INDEX `events_index_37` ON `events` (`advertisement_id`);

CREATE INDEX `events_index_38` ON `events` (`promotion_id`);

CREATE INDEX `events_index_39` ON `events` (`category_id`);

CREATE INDEX `events_index_40` ON `events` (`event_type`, `created_at`);

CREATE INDEX `events_index_41` ON `events` (`business_id`, `created_at`);

CREATE INDEX `events_index_42` ON `events` (`advertisement_id`, `created_at`);

CREATE INDEX `events_index_43` ON `events` (`promotion_id`, `created_at`);

CREATE INDEX `events_index_44` ON `events` (`category_id`, `created_at`);

CREATE INDEX `events_index_45` ON `events` (`created_at`);

CREATE INDEX `revenue_transactions_index_46` ON `revenue_transactions` (`business_id`);

CREATE INDEX `revenue_transactions_index_47` ON `revenue_transactions` (`advertisement_id`);

CREATE INDEX `revenue_transactions_index_48` ON `revenue_transactions` (`featured_listing_request_id`);

CREATE INDEX `revenue_transactions_index_49` ON `revenue_transactions` (`status`);

CREATE INDEX `revenue_transactions_index_50` ON `revenue_transactions` (`provider_reference`);

CREATE INDEX `revenue_transactions_index_51` ON `revenue_transactions` (`created_at`);

CREATE INDEX `revenue_transactions_index_52` ON `revenue_transactions` (`business_id`, `status`);

CREATE INDEX `password_reset_tokens_index_53` ON `password_reset_tokens` (`expires_at`);

CREATE INDEX `password_reset_tokens_index_54` ON `password_reset_tokens` (`business_account_id`);

CREATE INDEX `password_reset_tokens_index_55` ON `password_reset_tokens` (`admin_id`);

ALTER TABLE `businesses` ADD FOREIGN KEY (`account_id`) REFERENCES `business_accounts` (`id`);

ALTER TABLE `business_categories` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `business_categories` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `businesses` ADD FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`);

ALTER TABLE `business_hours` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `business_services` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `business_media` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `business_amenities` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `business_amenities` ADD FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`);

ALTER TABLE `promotions` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `promotions` ADD FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`);

ALTER TABLE `featured_listing_requests` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `featured_listing_requests` ADD FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`);

ALTER TABLE `advertisement_slots` ADD FOREIGN KEY (`type_id`) REFERENCES `advertisement_types` (`id`);

ALTER TABLE `advertisements` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `advertisements` ADD FOREIGN KEY (`slot_id`) REFERENCES `advertisement_slots` (`id`);

ALTER TABLE `advertisements` ADD FOREIGN KEY (`approved_by`) REFERENCES `admins` (`id`);

ALTER TABLE `events` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `events` ADD FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements` (`id`);

ALTER TABLE `events` ADD FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`);

ALTER TABLE `events` ADD FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `revenue_transactions` ADD FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`);

ALTER TABLE `revenue_transactions` ADD FOREIGN KEY (`advertisement_id`) REFERENCES `advertisements` (`id`);

ALTER TABLE `revenue_transactions` ADD FOREIGN KEY (`featured_listing_request_id`) REFERENCES `featured_listing_requests` (`id`);

ALTER TABLE `password_reset_tokens` ADD FOREIGN KEY (`business_account_id`) REFERENCES `business_accounts` (`id`);

ALTER TABLE `password_reset_tokens` ADD FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`);
