/**
 * Favorites Service
 *
 * LocalSpot V1 has no consumer accounts (see PRD Module 6 / dbschema.md),
 * so favorites are NOT stored in a dedicated table. The browser keeps the
 * list of favorited business IDs in localStorage. This service handles the
 * two things the backend is actually responsible for:
 *
 *   1. Recording favorite_add / favorite_remove as rows in the shared
 *      `events` table. The analytics module already aggregates these —
 *      see config/statement.js: businessEventSummary (favorites count on
 *      the business dashboard) and adminMostSavedBusinesses.
 *   2. Given the list of IDs the browser has saved, returning full listing
 *      cards so the "My Favorites" page has something to render.
 *
 * Follows the same raw SQL + query() pattern as discovery.service.js.
 */

import { query } from "../../config/db.js";
import { notFound } from "../../utils/errors.js";

/** Listing statuses that are visible to unauthenticated consumers. */
const PUBLIC_STATUSES = ["published", "active"];
const PUBLIC_STATUS_PLACEHOLDERS = PUBLIC_STATUSES.map(() => "?").join(", ");

// ---------------------------------------------------------------------------
// Open-now helper (mirrors discovery.service.js's buildOpenNowSubquery so
// favorites cards show the same "open/closed" status as every other listing
// card, per PRD 8.6). Duplicated locally rather than imported, following
// this project's convention of self-contained module services.
// ---------------------------------------------------------------------------

function buildOpenNowSubquery() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun … 6=Sat
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
// Serialiser — mirrors discovery.service.js's serializeBusiness field names
// (trimmed to what a listing card needs) so the frontend can reuse the same
// card component for favorites as it does for search/category results.
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
// Service: bulk-fetch businesses for the "My Favorites" page
// ---------------------------------------------------------------------------

/**
 * Given an array of business IDs (from the browser's localStorage list),
 * returns listing cards for the ones that are still publicly visible —
 * a business the user favorited may since have been unpublished or
 * deleted, and those are silently dropped rather than erroring.
 *
 * Preserves the order the IDs were requested in.
 *
 * @param {number[]} ids
 */
export async function getFavoriteBusinesses(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { businesses: [] };
  }

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

  return { businesses: rows.map(serializeFavoriteBusiness) };
}

// ---------------------------------------------------------------------------
// Service: add / remove favorite (event logging)
// ---------------------------------------------------------------------------

/**
 * Logs a favorite_add event for a business. Verifies the business exists
 * and is publicly visible first, so the events table doesn't fill up with
 * favorites against invalid or unpublished business IDs.
 *
 * @param {number} businessId
 * @param {{ visitorId?: string, ipAddress?: string, userAgent?: string }} meta
 */
export async function addFavorite(businessId, meta = {}) {
  const rows = await query(
    `SELECT id FROM businesses
     WHERE id = ? AND listing_status IN (${PUBLIC_STATUS_PLACEHOLDERS})
     LIMIT 1`,
    [businessId, ...PUBLIC_STATUSES]
  );

  if (rows.length === 0) {
    throw notFound("Business not found");
  }

  await query(
    `INSERT INTO events (event_type, business_id, visitor_id, ip_address, user_agent)
     VALUES ('favorite_add', ?, ?, ?, ?)`,
    [businessId, meta.visitorId || null, meta.ipAddress || null, meta.userAgent || null]
  );
}

/**
 * Logs a favorite_remove event for a business. Deliberately does NOT check
 * that the business still exists/is published — a user should always be
 * able to unfavorite something in their browser, even if the listing was
 * taken down after they saved it. events.business_id is nullable with
 * ON DELETE SET NULL, so this is safe either way.
 *
 * @param {number} businessId
 * @param {{ visitorId?: string, ipAddress?: string, userAgent?: string }} meta
 */
export async function removeFavorite(businessId, meta = {}) {
  await query(
    `INSERT INTO events (event_type, business_id, visitor_id, ip_address, user_agent)
     VALUES ('favorite_remove', (SELECT id FROM businesses WHERE id = ?), ?, ?, ?)`,
    [businessId, meta.visitorId || null, meta.ipAddress || null, meta.userAgent || null]
  );
}
