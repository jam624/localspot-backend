CREATE TABLE IF NOT EXISTS `reservations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `business_id` BIGINT UNSIGNED NOT NULL,
  `service_id` BIGINT UNSIGNED NULL,
  `reservation_at` DATETIME NOT NULL,
  `party_size` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `notes` VARCHAR(1000) NULL,
  `status` ENUM('pending', 'confirmed', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_reservations_user_date` (`user_id`, `reservation_at`),
  INDEX `idx_reservations_business_status_date` (`business_id`, `status`, `reservation_at`),
  CONSTRAINT `fk_reservations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservations_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservations_service` FOREIGN KEY (`service_id`) REFERENCES `business_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
