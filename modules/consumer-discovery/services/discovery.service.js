/**
 * Consumer Discovery Service
 *
 * Business logic for all public discovery endpoints.
 * Uses the same raw SQL + query() pattern as the rest of the project.
 * No ORM — all queries use parameterised placeholders to prevent SQL injection.
 *
 * Public visibility rule: businesses must have listing_status IN ('published', 'active').
 */

import { query } from "../../../config/db.js";
import { notFound } from "../../../utils/errors.js";
import { parsePagination, paginationMeta } from "../../../utils/pagination.js";
import { isOpenNow } from "../../../utils/openNow.js";

// Re-export so callers (including tests) can import from a single location
export { isOpenNow };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Listing statuses that are visible to unauthenticated consumers. */
const PUBLIC_STATUSES = ["published", "active"];

/**
 * Generates the correct number of SQL '?' placeholders for PUBLIC_STATUSES.
 * Evaluated once at module load — avoids repeated computation.
 */
const PUBLIC_STATUS_PLACEHOLDERS = PUBLIC_STATUSES.map(() => "?").join(", ");

// ---------------------------------------------------------------------------
// Open-now helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current day of week (0=Sunday…6=Saturday, matching MySQL
 * business_hours.day_of_week) and the current time as an "HH:MM:SS" string,
 * using the server's local clock.
 *
 * Note: if the server runs in UTC but businesses operate in WAT (UTC+1),
 * there will be a 1-hour offset. Set the process timezone (TZ env var) to
 * "Africa/Lagos" to align server time with Nigerian business hours.
 */
function getCurrentTimeInfo() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat — matches the schema comment
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return { dayOfWeek, currentTime: `${hh}:${mm}:${ss}` };
}

/**
 * Builds the SQL EXISTS subquery and its bound parameters for the open-now
 * filter. The logic mirrors isOpenNow() so DB filtering and JS filtering
 * stay consistent.
 *
 * @returns {{ sql: string, params: Array }}
 */
function buildOpenNowSubquery() {
  const { dayOfWeek, currentTime } = getCurrentTimeInfo();

  const sql = `EXISTS (
    SELECT 1 FROM business_hours bh
    WHERE bh.business_id = b.id
      AND bh.day_of_week = ?
      AND bh.is_closed = 0
      AND (
        (bh.opens_at < bh.closes_at
          AND ? BETWEEN bh.opens_at AND bh.closes_at)
        OR
        (bh.opens_at >= bh.closes_at
          AND (? >= bh.opens_at OR ? <= bh.closes_at))
      )
  )`;

  // Params: dayOfWeek, currentTime ×3 (for each ? in the time comparisons)
  return {
    sql,
    params: [dayOfWeek, currentTime, currentTime, currentTime],
  };
}

// ---------------------------------------------------------------------------
// Reusable SELECT fragment
// ---------------------------------------------------------------------------

/**
 * Core SELECT columns for a public business listing.
 * Excludes all private/sensitive fields (account credentials, internal IDs,
 * rejection reasons, financial data, admin notes).
 *
 * Correlated subqueries for logo/cover are efficient because
 * business_media has an index on (business_id, media_type).
 */
const BUSINESS_SELECT = `
  b.id,
  b.name,
  b.slug,
  b.description,
  b.phone,
  b.whatsapp,
  b.email AS business_email,
  b.website,
  b.address,
  b.city,
  b.area,
  b.state,
  b.country,
  b.latitude,
  b.longitude,
  b.price_range,
  b.average_rating,
  b.review_count,
  b.is_featured,
  b.published_at,
  b.created_at,
  c.id   AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.icon AS category_icon,
  (SELECT bm.url FROM business_media bm
   WHERE bm.business_id = b.id
     AND bm.media_type = 'logo'
     AND bm.is_active = 1
   ORDER BY bm.sort_order ASC
   LIMIT 1) AS logo_url,
  (SELECT bm.url FROM business_media bm
   WHERE bm.business_id = b.id
     AND bm.media_type = 'cover'
     AND bm.is_active = 1
   ORDER BY bm.sort_order ASC
   LIMIT 1) AS cover_url
`;

const BUSINESS_FROM = `
  FROM businesses b
  LEFT JOIN categories c ON c.id = b.category_id
`;

// ---------------------------------------------------------------------------
// Sort clause builder
// ---------------------------------------------------------------------------

/**
 * Returns the ORDER BY clause for the requested sort strategy.
 *
 * - recommended  : featured businesses first, then by rating + review count
 * - highest-rated: sort purely by average_rating descending
 * - most-popular : sort by review_count (engagement volume) descending
 * - newest       : most recently published first
 */
function buildSortClause(sort) {
  switch (sort) {
    case "highest-rated":
      return "ORDER BY b.average_rating DESC, b.review_count DESC";
    case "most-popular":
      return "ORDER BY b.review_count DESC, b.average_rating DESC";
    case "newest":
      return "ORDER BY b.published_at DESC, b.created_at DESC";
    case "recommended":
    default:
      return "ORDER BY b.is_featured DESC, b.average_rating DESC, b.review_count DESC, b.published_at DESC";
  }
}

// ---------------------------------------------------------------------------
// Serialisers — DB row → public API shape
// ---------------------------------------------------------------------------

/**
 * Maps a raw database business row to the consumer-safe API shape.
 * Never exposes: password hashes, account IDs, rejection reasons,
 * internal status metadata, or financial data.
 */
export function serializeBusiness(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    category: row.category_id
      ? {
          id: Number(row.category_id),
          name: row.category_name,
          slug: row.category_slug,
          icon: row.category_icon || null,
        }
      : null,
    location: {
      address: row.address || null,
      area: row.area || null,
      city: row.city,
      state: row.state || null,
      country: row.country,
      latitude: row.latitude !== null ? parseFloat(row.latitude) : null,
      longitude: row.longitude !== null ? parseFloat(row.longitude) : null,
    },
    contact: {
      phone: row.phone || null,
      whatsapp: row.whatsapp || null,
      email: row.business_email || null,
      website: row.website || null,
    },
    priceRange: row.price_range || null,
    averageRating: parseFloat(row.average_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    isFeatured: Boolean(Number(row.is_featured)),
    logo: row.logo_url || null,
    cover: row.cover_url || null,
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
  };
}

function serializePromotion(row) {
  return {
    id: Number(row.id),
    title: row.title,
    slug: row.slug,
    description: row.description || null,
    discountLabel: row.discount_label || null,
    imageUrl: row.image_url || null,
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    business: {
      id: Number(row.business_id),
      name: row.business_name,
      slug: row.business_slug,
      logo: row.business_logo || null,
    },
  };
}

function serializeAdvertisement(row) {
  return {
    id: Number(row.id),
    title: row.title,
    body: row.body || null,
    imageUrl: row.image_url || null,
    destinationUrl: row.destination_url || null,
    slot: {
      id: Number(row.slot_id),
      code: row.slot_code,
      name: row.slot_name,
      placement: row.slot_placement,
    },
    business: {
      id: Number(row.business_id),
      name: row.business_name,
      slug: row.business_slug,
    },
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
  };
}

function serializeCategory(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description || null,
    icon: row.icon || null,
    sortOrder: Number(row.sort_order),
    businessCount: Number(row.business_count) || 0,
  };
}

// ---------------------------------------------------------------------------
// Shared promotion / advertisement SELECT fragments
// ---------------------------------------------------------------------------

const PROMOTION_SELECT = `
  p.id, p.title, p.slug, p.description, p.discount_label, p.image_url,
  p.starts_at, p.ends_at, p.business_id,
  b.name AS business_name, b.slug AS business_slug,
  (SELECT bm.url FROM business_media bm
   WHERE bm.business_id = b.id
     AND bm.media_type = 'logo'
     AND bm.is_active = 1
   ORDER BY bm.sort_order ASC
   LIMIT 1) AS business_logo
`;

const PROMOTION_FROM = `
  FROM promotions p
  INNER JOIN businesses b ON b.id = p.business_id
`;

const ACTIVE_PROMOTION_WHERE = `
  WHERE p.status = 'active'
    AND b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
    AND (p.starts_at IS NULL OR p.starts_at <= NOW())
    AND (p.ends_at   IS NULL OR p.ends_at   >= NOW())
`;

const ADVERTISEMENT_SELECT = `
  a.id, a.title, a.body, a.image_url, a.destination_url,
  a.starts_at, a.ends_at, a.business_id, a.slot_id,
  s.code      AS slot_code,
  s.name      AS slot_name,
  s.placement AS slot_placement,
  b.name AS business_name, b.slug AS business_slug
`;

const ADVERTISEMENT_FROM = `
  FROM advertisements a
  INNER JOIN businesses b ON b.id = a.business_id
  INNER JOIN advertisement_slots s ON s.id = a.slot_id
`;

const ACTIVE_ADVERTISEMENT_WHERE = `
  WHERE a.status = 'active'
    AND b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
    AND (a.starts_at IS NULL OR a.starts_at <= NOW())
    AND (a.ends_at   IS NULL OR a.ends_at   >= NOW())
`;

// ---------------------------------------------------------------------------
// Service: categories
// ---------------------------------------------------------------------------

/**
 * Returns all active categories with a live count of publicly visible
 * businesses in each.
 */
export async function getCategories() {
  const rows = await query(
    `SELECT
       c.id, c.name, c.slug, c.description, c.icon, c.sort_order,
       COUNT(b.id) AS business_count
     FROM categories c
     LEFT JOIN businesses b
       ON b.category_id = c.id
       AND b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`,
    [...PUBLIC_STATUSES]
  );

  return rows.map(serializeCategory);
}

// ---------------------------------------------------------------------------
// Service: business search
// ---------------------------------------------------------------------------

/**
 * Searches and filters publicly visible businesses.
 * Supports full-text search, category/location/rating/priceRange/openNow
 * filters, four sort strategies, and pagination.
 *
 * Performance notes:
 * - All filtering happens in the database via WHERE clauses.
 * - COUNT and data queries run concurrently via Promise.all().
 * - Full-text search uses the existing FULLTEXT index on (name, description, area, city).
 * - A name LIKE fallback is combined (OR) so short search terms still match.
 */
export async function searchBusinesses(rawQuery) {
  const { page, limit, offset } = parsePagination(rawQuery);
  const { q, category, location, rating, priceRange, openNow, sort } = rawQuery;

  const conditions = [
    `b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})`,
  ];
  const params = [...PUBLIC_STATUSES];

  // Full-text + LIKE name search
  if (q && q.trim()) {
    const term = q.trim();
    conditions.push(
      `(MATCH(b.name, b.description, b.area, b.city) AGAINST(? IN BOOLEAN MODE) OR b.name LIKE ?)`
    );
    params.push(term, `%${term}%`);
  }

  // Category filter by slug
  if (category && category.trim()) {
    conditions.push(
      `b.category_id = (SELECT id FROM categories WHERE slug = ? AND is_active = 1 LIMIT 1)`
    );
    params.push(category.trim());
  }

  // Location filter — matches city or area (case-insensitive via LIKE)
  if (location && location.trim()) {
    conditions.push(`(b.city LIKE ? OR b.area LIKE ?)`);
    const loc = `%${location.trim()}%`;
    params.push(loc, loc);
  }

  // Minimum rating filter
  if (rating) {
    conditions.push(`b.average_rating >= ?`);
    params.push(parseFloat(rating));
  }

  // Exact price range filter (1=budget … 4=luxury)
  if (priceRange) {
    conditions.push(`b.price_range = ?`);
    params.push(parseInt(priceRange, 10));
  }

  // Open-now filter — uses a correlated subquery against business_hours
  if (openNow === "true") {
    const { sql: openSql, params: openParams } = buildOpenNowSubquery();
    conditions.push(openSql);
    params.push(...openParams);
  }

  const WHERE = `WHERE ${conditions.join(" AND ")}`;
  const ORDER = buildSortClause(sort);

  const [countRows, dataRows] = await Promise.all([
    query(`SELECT COUNT(*) AS total ${BUSINESS_FROM} ${WHERE}`, params),
    query(
      `SELECT ${BUSINESS_SELECT} ${BUSINESS_FROM} ${WHERE} ${ORDER} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
  ]);

  return {
    businesses: dataRows.map(serializeBusiness),
    meta: paginationMeta(page, limit, Number(countRows[0].total)),
  };
}

// ---------------------------------------------------------------------------
// Service: businesses by category
// ---------------------------------------------------------------------------

/**
 * Returns paginated businesses for a specific category slug, with the same
 * filtering capabilities as searchBusinesses (excluding q and category params).
 */
export async function getBusinessesByCategory(slug, rawQuery) {
  // Verify the category exists and is active
  const catRows = await query(
    `SELECT id, name, slug, description, icon FROM categories
     WHERE slug = ? AND is_active = 1 LIMIT 1`,
    [slug]
  );

  if (!catRows.length) {
    throw notFound(`Category '${slug}' not found`);
  }

  const cat = catRows[0];
  const { page, limit, offset } = parsePagination(rawQuery);
  const { location, rating, priceRange, openNow, sort } = rawQuery;

  const conditions = [
    `b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})`,
    `b.category_id = ?`,
  ];
  const params = [...PUBLIC_STATUSES, cat.id];

  if (location && location.trim()) {
    conditions.push(`(b.city LIKE ? OR b.area LIKE ?)`);
    const loc = `%${location.trim()}%`;
    params.push(loc, loc);
  }

  if (rating) {
    conditions.push(`b.average_rating >= ?`);
    params.push(parseFloat(rating));
  }

  if (priceRange) {
    conditions.push(`b.price_range = ?`);
    params.push(parseInt(priceRange, 10));
  }

  if (openNow === "true") {
    const { sql: openSql, params: openParams } = buildOpenNowSubquery();
    conditions.push(openSql);
    params.push(...openParams);
  }

  const WHERE = `WHERE ${conditions.join(" AND ")}`;
  const ORDER = buildSortClause(sort);

  const [countRows, dataRows] = await Promise.all([
    query(`SELECT COUNT(*) AS total ${BUSINESS_FROM} ${WHERE}`, params),
    query(
      `SELECT ${BUSINESS_SELECT} ${BUSINESS_FROM} ${WHERE} ${ORDER} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
  ]);

  return {
    category: {
      id: Number(cat.id),
      name: cat.name,
      slug: cat.slug,
      description: cat.description || null,
      icon: cat.icon || null,
    },
    businesses: dataRows.map(serializeBusiness),
    meta: paginationMeta(page, limit, Number(countRows[0].total)),
  };
}

// ---------------------------------------------------------------------------
// Service: featured businesses
// ---------------------------------------------------------------------------

/**
 * Returns businesses flagged as featured (is_featured = 1).
 * Featured status is set by admin when approving a featured_listing_request.
 */
export async function getFeaturedBusinesses(rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);

  const [countRows, dataRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total ${BUSINESS_FROM}
       WHERE b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
         AND b.is_featured = 1`,
      [...PUBLIC_STATUSES]
    ),
    query(
      `SELECT ${BUSINESS_SELECT} ${BUSINESS_FROM}
       WHERE b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
         AND b.is_featured = 1
       ORDER BY b.average_rating DESC, b.review_count DESC
       LIMIT ? OFFSET ?`,
      [...PUBLIC_STATUSES, limit, offset]
    ),
  ]);

  return {
    businesses: dataRows.map(serializeBusiness),
    meta: paginationMeta(page, limit, Number(countRows[0].total)),
  };
}

// ---------------------------------------------------------------------------
// Service: popular businesses
// ---------------------------------------------------------------------------

/**
 * Returns popular businesses ranked by engagement signals available in the
 * current schema: review_count (volume) and average_rating (quality).
 *
 * The events table provides richer signals (views, favorites, clicks) but
 * aggregating it on every request would be expensive without materialised
 * views or caching. The denormalised columns on businesses are the right
 * signals to use here.
 */
export async function getPopularBusinesses(rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);

  const [countRows, dataRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total ${BUSINESS_FROM}
       WHERE b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})`,
      [...PUBLIC_STATUSES]
    ),
    query(
      `SELECT ${BUSINESS_SELECT} ${BUSINESS_FROM}
       WHERE b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
       ORDER BY b.review_count DESC, b.average_rating DESC, b.published_at DESC
       LIMIT ? OFFSET ?`,
      [...PUBLIC_STATUSES, limit, offset]
    ),
  ]);

  return {
    businesses: dataRows.map(serializeBusiness),
    meta: paginationMeta(page, limit, Number(countRows[0].total)),
  };
}

// ---------------------------------------------------------------------------
// Service: active promotions
// ---------------------------------------------------------------------------

/**
 * Returns currently active promotions whose parent businesses are publicly
 * visible. Respects status='active' AND the starts_at/ends_at date window.
 */
export async function getActivePromotions(rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);

  const [countRows, dataRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       ${PROMOTION_FROM}
       ${ACTIVE_PROMOTION_WHERE}`,
      [...PUBLIC_STATUSES]
    ),
    query(
      `SELECT ${PROMOTION_SELECT}
       ${PROMOTION_FROM}
       ${ACTIVE_PROMOTION_WHERE}
       ORDER BY p.starts_at DESC
       LIMIT ? OFFSET ?`,
      [...PUBLIC_STATUSES, limit, offset]
    ),
  ]);

  return {
    promotions: dataRows.map(serializePromotion),
    meta: paginationMeta(page, limit, Number(countRows[0].total)),
  };
}

// ---------------------------------------------------------------------------
// Service: active advertisements
// ---------------------------------------------------------------------------

/**
 * Returns currently active advertisements. Only exposes ads whose status is
 * 'active' and whose parent business is publicly visible.
 * Private financial data (budget, cost) is never included.
 */
export async function getActiveAdvertisements(rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);

  const [countRows, dataRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total
       ${ADVERTISEMENT_FROM}
       ${ACTIVE_ADVERTISEMENT_WHERE}`,
      [...PUBLIC_STATUSES]
    ),
    query(
      `SELECT ${ADVERTISEMENT_SELECT}
       ${ADVERTISEMENT_FROM}
       ${ACTIVE_ADVERTISEMENT_WHERE}
       ORDER BY a.starts_at DESC
       LIMIT ? OFFSET ?`,
      [...PUBLIC_STATUSES, limit, offset]
    ),
  ]);

  return {
    advertisements: dataRows.map(serializeAdvertisement),
    meta: paginationMeta(page, limit, Number(countRows[0].total)),
  };
}

// ---------------------------------------------------------------------------
// Service: homepage aggregation
// ---------------------------------------------------------------------------

/**
 * Returns all homepage sections in a single request.
 * All 5 queries run concurrently via Promise.all() to minimise latency.
 * Each section is capped at a homepage-appropriate limit to avoid over-fetching.
 */
export async function getHomepageData() {
  const [
    categoriesRows,
    featuredRows,
    popularRows,
    promotionsRows,
    advertisementsRows,
  ] = await Promise.all([
    // 1. Categories — up to 12, ordered by sort_order
    query(
      `SELECT
         c.id, c.name, c.slug, c.description, c.icon, c.sort_order,
         COUNT(b.id) AS business_count
       FROM categories c
       LEFT JOIN businesses b
         ON b.category_id = c.id
         AND b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
       WHERE c.is_active = 1
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC
       LIMIT 12`,
      [...PUBLIC_STATUSES]
    ),

    // 2. Featured businesses — up to 8
    query(
      `SELECT ${BUSINESS_SELECT}
       ${BUSINESS_FROM}
       WHERE b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
         AND b.is_featured = 1
       ORDER BY b.average_rating DESC, b.review_count DESC
       LIMIT 8`,
      [...PUBLIC_STATUSES]
    ),

    // 3. Popular businesses — up to 8
    query(
      `SELECT ${BUSINESS_SELECT}
       ${BUSINESS_FROM}
       WHERE b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
       ORDER BY b.review_count DESC, b.average_rating DESC
       LIMIT 8`,
      [...PUBLIC_STATUSES]
    ),

    // 4. Active promotions — up to 6
    query(
      `SELECT ${PROMOTION_SELECT}
       ${PROMOTION_FROM}
       ${ACTIVE_PROMOTION_WHERE}
       ORDER BY p.starts_at DESC
       LIMIT 6`,
      [...PUBLIC_STATUSES]
    ),

    // 5. Active advertisements — up to 4
    query(
      `SELECT ${ADVERTISEMENT_SELECT}
       ${ADVERTISEMENT_FROM}
       ${ACTIVE_ADVERTISEMENT_WHERE}
       ORDER BY a.starts_at DESC
       LIMIT 4`,
      [...PUBLIC_STATUSES]
    ),
  ]);

  return {
    categories: categoriesRows.map(serializeCategory),
    featuredBusinesses: featuredRows.map(serializeBusiness),
    popularBusinesses: popularRows.map(serializeBusiness),
    promotions: promotionsRows.map(serializePromotion),
    advertisements: advertisementsRows.map(serializeAdvertisement),
  };
}
