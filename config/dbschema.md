# LocalSpot Sample Database Schema

This is a starter MySQL schema based on the API design in `README.MD`.
It is intentionally practical for the current Express/MySQL repo and can be
split into migration files later.

## Design Notes

- Database engine: MySQL, using `mysql2`.
- Primary keys use `BIGINT UNSIGNED AUTO_INCREMENT` for simple class/project setup.
- Public IDs/slugs can still be exposed through the API instead of raw numeric IDs.
- Favorites are not stored as a user table in V1 because the README recommends
  browser `localStorage`; favorite add/remove actions are tracked through `events`.
- Analytics are event-driven. Business dashboards and admin reports can aggregate
  data from `events`, `advertisements`, and `revenue_transactions`.

## Core Tables

```sql
CREATE DATABASE IF NOT EXISTS localspot_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE localspot_db;

CREATE TABLE admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'moderator') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
);

CREATE TABLE business_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_name VARCHAR(180) NOT NULL,
  owner_name VARCHAR(140) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_accounts_email (email),
  UNIQUE KEY uq_business_accounts_phone (phone)
);

CREATE TABLE categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_active_sort (is_active, sort_order)
);

CREATE TABLE businesses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  description TEXT NULL,
  phone VARCHAR(40) NULL,
  whatsapp VARCHAR(40) NULL,
  email VARCHAR(180) NULL,
  website VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(120) NOT NULL DEFAULT 'Port Harcourt',
  area VARCHAR(120) NULL,
  state VARCHAR(120) NULL,
  country VARCHAR(120) NOT NULL DEFAULT 'Nigeria',
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  price_range TINYINT UNSIGNED NULL,
  average_rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  listing_status ENUM(
    'draft',
    'submitted',
    'pending_approval',
    'approved',
    'rejected',
    'published',
    'active',
    'inactive',
    'suspended'
  ) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_businesses_slug (slug),
  KEY idx_businesses_category_status (category_id, listing_status),
  KEY idx_businesses_location (city, area),
  KEY idx_businesses_featured (is_featured, listing_status),
  FULLTEXT KEY ft_businesses_search (name, description, area, city),
  CONSTRAINT fk_businesses_account
    FOREIGN KEY (account_id) REFERENCES business_accounts(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_businesses_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_businesses_approved_by
    FOREIGN KEY (approved_by) REFERENCES admins(id)
    ON DELETE SET NULL
);

CREATE TABLE business_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  opens_at TIME NULL,
  closes_at TIME NULL,
  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_business_hours_day (business_id, day_of_week),
  CONSTRAINT fk_business_hours_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE
);

CREATE TABLE business_services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12, 2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_business_services_business (business_id),
  CONSTRAINT fk_business_services_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE
);

CREATE TABLE amenities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_amenities_slug (slug)
);

CREATE TABLE business_amenities (
  business_id BIGINT UNSIGNED NOT NULL,
  amenity_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, amenity_id),
  CONSTRAINT fk_business_amenities_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_business_amenities_amenity
    FOREIGN KEY (amenity_id) REFERENCES amenities(id)
    ON DELETE CASCADE
);

CREATE TABLE business_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('logo', 'cover', 'gallery', 'advertisement', 'promotion') NOT NULL DEFAULT 'gallery',
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(180) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_business_media_business_type (business_id, media_type),
  CONSTRAINT fk_business_media_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE
);
```

## Promotions And Featured Listings

```sql
CREATE TABLE promotions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(220) NOT NULL,
  description TEXT NULL,
  discount_label VARCHAR(80) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'active', 'expired', 'disabled') NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_promotions_slug (slug),
  KEY idx_promotions_business_status (business_id, status),
  KEY idx_promotions_dates (starts_at, ends_at),
  CONSTRAINT fk_promotions_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_promotions_approved_by
    FOREIGN KEY (approved_by) REFERENCES admins(id)
    ON DELETE SET NULL
);

CREATE TABLE featured_listing_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  placement VARCHAR(120) NOT NULL DEFAULT 'homepage_featured',
  requested_start_date DATE NULL,
  requested_end_date DATE NULL,
  status ENUM('requested', 'pending_approval', 'approved', 'rejected', 'active', 'expired', 'disabled') NOT NULL DEFAULT 'requested',
  rejection_reason TEXT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_featured_business_status (business_id, status),
  CONSTRAINT fk_featured_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_featured_approved_by
    FOREIGN KEY (approved_by) REFERENCES admins(id)
    ON DELETE SET NULL
);
```

## Advertising

```sql
CREATE TABLE advertisement_types (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(140) NOT NULL,
  description TEXT NULL,
  base_price DECIMAL(12, 2) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_advertisement_types_code (code)
);

CREATE TABLE advertisement_slots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(160) NOT NULL,
  placement VARCHAR(160) NOT NULL,
  max_active_campaigns INT UNSIGNED NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ad_slots_code (code),
  CONSTRAINT fk_ad_slots_type
    FOREIGN KEY (type_id) REFERENCES advertisement_types(id)
);

CREATE TABLE advertisements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  slot_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NULL,
  image_url VARCHAR(500) NULL,
  destination_url VARCHAR(500) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  budget DECIMAL(12, 2) NULL,
  status ENUM(
    'draft',
    'submitted',
    'pending_approval',
    'approved',
    'rejected',
    'scheduled',
    'active',
    'paused',
    'expired',
    'disabled'
  ) NOT NULL DEFAULT 'draft',
  rejection_reason TEXT NULL,
  approved_by BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ads_business_status (business_id, status),
  KEY idx_ads_slot_status_dates (slot_id, status, starts_at, ends_at),
  CONSTRAINT fk_ads_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ads_slot
    FOREIGN KEY (slot_id) REFERENCES advertisement_slots(id),
  CONSTRAINT fk_ads_approved_by
    FOREIGN KEY (approved_by) REFERENCES admins(id)
    ON DELETE SET NULL
);
```

## Analytics Events

```sql
CREATE TABLE events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type ENUM(
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
  business_id BIGINT UNSIGNED NULL,
  advertisement_id BIGINT UNSIGNED NULL,
  promotion_id BIGINT UNSIGNED NULL,
  category_id BIGINT UNSIGNED NULL,
  search_query VARCHAR(255) NULL,
  platform VARCHAR(80) NULL,
  visitor_id VARCHAR(120) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  referrer VARCHAR(500) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_type_date (event_type, created_at),
  KEY idx_events_business_date (business_id, created_at),
  KEY idx_events_ad_date (advertisement_id, created_at),
  KEY idx_events_promotion_date (promotion_id, created_at),
  CONSTRAINT fk_events_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_events_advertisement
    FOREIGN KEY (advertisement_id) REFERENCES advertisements(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_events_promotion
    FOREIGN KEY (promotion_id) REFERENCES promotions(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_events_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE SET NULL
);
```

## Revenue

```sql
CREATE TABLE revenue_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id BIGINT UNSIGNED NOT NULL,
  advertisement_id BIGINT UNSIGNED NULL,
  featured_listing_request_id BIGINT UNSIGNED NULL,
  transaction_type ENUM('advertisement', 'featured_listing', 'promotion_boost', 'manual') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'NGN',
  payment_provider VARCHAR(80) NULL,
  provider_reference VARCHAR(180) NULL,
  status ENUM('requested', 'pending_review', 'pending_payment', 'paid', 'failed', 'refunded', 'cancelled') NOT NULL DEFAULT 'requested',
  paid_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_revenue_business_status (business_id, status),
  KEY idx_revenue_created_at (created_at),
  CONSTRAINT fk_revenue_business
    FOREIGN KEY (business_id) REFERENCES businesses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_revenue_advertisement
    FOREIGN KEY (advertisement_id) REFERENCES advertisements(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_revenue_featured
    FOREIGN KEY (featured_listing_request_id) REFERENCES featured_listing_requests(id)
    ON DELETE SET NULL
);
```

## Auth Support

```sql
CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_type ENUM('business', 'admin') NOT NULL,
  business_account_id BIGINT UNSIGNED NULL,
  admin_id BIGINT UNSIGNED NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_expires (expires_at),
  CONSTRAINT fk_password_reset_business
    FOREIGN KEY (business_account_id) REFERENCES business_accounts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_password_reset_admin
    FOREIGN KEY (admin_id) REFERENCES admins(id)
    ON DELETE CASCADE
);
```

## Seed Data Example

```sql
INSERT INTO categories (name, slug, description, sort_order)
VALUES
  ('Restaurants', 'restaurants', 'Places to eat and drink', 1),
  ('Hotels', 'hotels', 'Accommodation and short stays', 2),
  ('Health and Beauty', 'health-and-beauty', 'Salons, spas, clinics, and wellness services', 3);

INSERT INTO advertisement_types (code, name, description, base_price)
VALUES
  ('banner', 'Banner Advertisement', 'Display banner placement', 50000.00),
  ('sponsored_listing', 'Sponsored Listing', 'Boosted business listing placement', 35000.00);

INSERT INTO advertisement_slots (type_id, code, name, placement)
VALUES
  (1, 'homepage_top_banner', 'Homepage Top Banner', 'discovery_home'),
  (2, 'category_sponsored', 'Category Sponsored Listing', 'category_page');
```

## Suggested Build Order

1. Create `admins`, `business_accounts`, `categories`, and `businesses`.
2. Add `business_hours`, `business_services`, `amenities`, and `business_media`.
3. Add `promotions` and the public discovery/search endpoints.
4. Add `events` before analytics dashboards.
5. Add advertising, featured listing, and revenue tables when those endpoints are ready.
