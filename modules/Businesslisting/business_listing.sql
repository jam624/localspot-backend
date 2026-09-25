-- LocalSpot: business listing tables (MySQL 8+, InnoDB, utf8mb4)
-- Assumes existing `users` (id) and `categories` (id, name, slug, is_active) tables.
-- Column types of owner_id / created_by / category_id MUST match users.id / categories.id
-- (BIGINT UNSIGNED here; change to INT UNSIGNED etc. if yours differ).

CREATE TABLE businesses (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id        BIGINT UNSIGNED NULL,          -- NULL = listing created manually by admin
  created_by      BIGINT UNSIGNED NULL,
  category_id     BIGINT UNSIGNED NOT NULL,

  name            VARCHAR(120)  NOT NULL,
  slug            VARCHAR(80)   NOT NULL,
  description     TEXT          NULL,
  phone           VARCHAR(30)   NULL,
  whatsapp        VARCHAR(30)   NULL,
  email           VARCHAR(200)  NULL,
  website         VARCHAR(500)  NULL,

  address         VARCHAR(250)  NULL,
  city            VARCHAR(80)   NULL,
  area            VARCHAR(80)   NULL,
  latitude        DECIMAL(9,6)  NULL,
  longitude       DECIMAL(9,6)  NULL,

  price_range     TINYINT UNSIGNED NULL,          -- 1 (cheap) .. 4 (expensive)
  logo_url        VARCHAR(500)  NULL,
  logo_public_id  VARCHAR(200)  NULL,
  cover_url       VARCHAR(500)  NULL,
  cover_public_id VARCHAR(200)  NULL,

  rating          DECIMAL(2,1)  NOT NULL DEFAULT 0.0,
  rating_count    INT UNSIGNED  NOT NULL DEFAULT 0,
  view_count      INT UNSIGNED  NOT NULL DEFAULT 0,

  status          ENUM('draft','submitted','pending_approval','approved','published','rejected','suspended')
                  NOT NULL DEFAULT 'draft',
  status_reason   VARCHAR(500)  NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  is_featured     TINYINT(1)    NOT NULL DEFAULT 0,   -- managed by the Advertising module
  is_sponsored    TINYINT(1)    NOT NULL DEFAULT 0,   -- managed by the Advertising module
  published_at    DATETIME      NULL,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_businesses_slug (slug),
  KEY idx_businesses_listing (status, is_active, category_id, area),
  KEY idx_businesses_city_area (city, area),
  KEY idx_businesses_owner (owner_id),
  CONSTRAINT fk_businesses_owner    FOREIGN KEY (owner_id)    REFERENCES users (id)      ON DELETE SET NULL,
  CONSTRAINT fk_businesses_creator  FOREIGN KEY (created_by)  REFERENCES users (id)      ON DELETE SET NULL,
  CONSTRAINT fk_businesses_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per open interval. day: 0 = Sunday .. 6 = Saturday. Minutes from midnight (0-1440).
-- A closed day has no rows. Overnight hours: 18:00-24:00 on day N + 00:00-02:00 on day N+1.
CREATE TABLE business_hours (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id  BIGINT UNSIGNED NOT NULL,
  day          TINYINT UNSIGNED  NOT NULL,
  open_min     SMALLINT UNSIGNED NOT NULL,
  close_min    SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_hours_lookup (business_id, day, open_min, close_min),
  CONSTRAINT fk_hours_business FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Services and amenities
CREATE TABLE business_attributes (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id  BIGINT UNSIGNED NOT NULL,
  type         ENUM('service','amenity') NOT NULL,
  name         VARCHAR(60) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attr (business_id, type, name),
  CONSTRAINT fk_attr_business FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gallery images
CREATE TABLE business_images (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_id  BIGINT UNSIGNED NOT NULL,
  url          VARCHAR(500) NOT NULL,
  public_id    VARCHAR(200) NULL,
  position     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_images_business (business_id, position),
  CONSTRAINT fk_images_business FOREIGN KEY (business_id) REFERENCES businesses (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
