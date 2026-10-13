/**
 * Favorites Service (V2 — with consumer auth)
 *
 * Favorites are now stored server-side in the `user_favorites` table.
 * Logged-in users get persistent favorites tied to their account.
 *
 * The service also:
 *   1. Records favorite_add / favorite_remove events in the `events` table
 *      (analytics still works exactly as before).
 *   2. Provides bulk-fetch of listing cards for the "My Favorites" page,
 *      driven by the user's DB rows instead of a client-supplied ID list.
 *
 * Follows the same raw SQL + query() pattern as discovery.service.js.
 */

import pool from "../../config/db.js";
import { query } from "../../config/db.js";
import { userFavoriteStatements } from "../../config/statement.js";
import { notFound } from "../../utils/errors.js";
import { parsePagination, paginationMeta } from "../../utils/pagination.js";

/** Listing statuses that are visible to unauthenticated consumers. */
const PUBLIC_STATUSES = ["published", "active"];
const PUBLIC_STATUS_PLACEHOLDERS = PUBLIC_STATUSES.map(() => "?").join(", ");

// ---------------------------------------------------------------------------
// Open-now helper (mirrors discovery.service.js)
// ---------------------------------------------------------------------------

function buildOpenNowSubquery() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const currentTime = `${hh}:${mm}:${ss}`;

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

  return { sql, params: [dayOfWeek, currentTime, currentTime, currentTime] };
}

// ---------------------------------------------------------------------------
// Serialiser — mirrors discovery.service.js field names
// ---------------------------------------------------------------------------

function serializeFavoriteBusiness(row) {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    category: row.category_id
      ? {
          id: Number(row.category_id),
          name: row.category_name,
          slug: row.category_slug,
          icon: row.category_icon || null,
        }
      : null,
    location: {
      area: row.area || null,
      city: row.city,
      state: row.state || null,
    },
    priceRange: row.price_range || null,
    averageRating: parseFloat(row.average_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    isFeatured: Boolean(Number(row.is_featured)),
    isOpenNow: Boolean(Number(row.is_open_now)),
    logo: row.logo_url || null,
    cover: row.cover_url || null,
  };
}

// ---------------------------------------------------------------------------
// Core card-fetch helper — shared by both user-favorites and legacy bulk fetch
// ---------------------------------------------------------------------------

async function fetchBusinessCards(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const idPlaceholders = ids.map(() => "?").join(", ");
  const orderPlaceholders = ids.map(() => "?").join(", ");
  const { sql: openSql, params: openParams } = buildOpenNowSubquery();

  const rows = await query(
    `SELECT
       b.id, b.name, b.slug, b.area, b.city, b.state, b.price_range,
       b.average_rating, b.review_count, b.is_featured,
       c.id   AS category_id,
       c.name AS category_name,
       c.slug AS category_slug,
       c.icon AS category_icon,
       (SELECT bm.url FROM business_media bm
        WHERE bm.business_id = b.id AND bm.media_type = 'logo' AND bm.is_active = 1
        ORDER BY bm.sort_order ASC LIMIT 1) AS logo_url,
       (SELECT bm.url FROM business_media bm
        WHERE bm.business_id = b.id AND bm.media_type = 'cover' AND bm.is_active = 1
        ORDER BY bm.sort_order ASC LIMIT 1) AS cover_url,
       ${openSql} AS is_open_now
     FROM businesses b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.id IN (${idPlaceholders})
       AND b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
     ORDER BY FIELD(b.id, ${orderPlaceholders})`,
    [...openParams, ...ids, ...PUBLIC_STATUSES, ...ids]
  );

  return rows.map(serializeFavoriteBusiness);
}

// ---------------------------------------------------------------------------
// Service: list favorites for authenticated user
// ---------------------------------------------------------------------------

/**
 * Returns favorites for the logged-in user as listing cards, with pagination.
 * Businesses that have since been unpublished are silently dropped.
 *
 * @param {number} userId
 * @param {object} rawQuery
 */
export async function getUserFavorites(userId, rawQuery = {}) {
  const { page, limit, offset } = parsePagination(rawQuery);
  const [countRows] = await pool.execute(userFavoriteStatements.countByUser, [userId]);
  const total = Number(countRows[0]?.total || 0);

  const [idRows] = await pool.execute(
    `SELECT uf.business_id
     FROM user_favorites uf
     JOIN businesses b ON b.id = uf.business_id
     WHERE uf.user_id = ? AND b.listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
     ORDER BY uf.created_at DESC LIMIT ? OFFSET ?`,
    [userId, ...PUBLIC_STATUSES, limit, offset]
  );
  const ids = idRows.map((r) => Number(r.business_id));
  const businesses = await fetchBusinessCards(ids);
  return {
    businesses,
    meta: paginationMeta(page, limit, total),
  };
}

// ---------------------------------------------------------------------------
// Service: add / remove favorite
// ---------------------------------------------------------------------------

/**
 * Adds a business to the user's server-side favorites and logs the event.
 *
 * @param {number} userId
 * @param {number} businessId
 * @param {{ ipAddress?: string, userAgent?: string }} meta
 */
export async function addFavorite(userId, businessId, meta = {}) {
  // Verify the business is publicly visible
  const rows = await query(
    `SELECT id FROM businesses
     WHERE id = ? AND listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
     LIMIT 1`,
    [businessId, ...PUBLIC_STATUSES]
  );

  if (rows.length === 0) {
    throw notFound("Business not found");
  }

  // Upsert the favorite (INSERT IGNORE handles duplicates gracefully)
  const [favoriteResult] = await pool.execute(userFavoriteStatements.add, [userId, businessId]);

  if (favoriteResult.affectedRows) {
    await query(
      `INSERT INTO events (event_type, business_id, user_id, ip_address, user_agent)
       VALUES ('favorite_add', ?, ?, ?, ?)`,
      [businessId, userId, meta.ipAddress || null, meta.userAgent || null]
    );
  }
}

/**
 * Removes a business from the user's favorites and logs the event.
 *
 * @param {number} userId
 * @param {number} businessId
 * @param {{ ipAddress?: string, userAgent?: string }} meta
 */
export async function removeFavorite(userId, businessId, meta = {}) {
  const [favoriteResult] = await pool.execute(userFavoriteStatements.remove, [userId, businessId]);

  if (favoriteResult.affectedRows) {
    await query(
      `INSERT INTO events (event_type, business_id, user_id, ip_address, user_agent)
       VALUES ('favorite_remove', (SELECT id FROM businesses WHERE id = ?), ?, ?, ?)`,
      [businessId, userId, meta.ipAddress || null, meta.userAgent || null]
    );
  }
}

/**
 * Checks whether a specific user has favorited a specific business.
 * Used by optionalUserAuth-protected endpoints to return isFavorited.
 *
 * @param {number} userId
 * @param {number} businessId
 * @returns {Promise<boolean>}
 */
export async function isFavorited(userId, businessId) {
  const [rows] = await pool.execute(userFavoriteStatements.exists, [userId, businessId]);
  return rows.length > 0;
}
