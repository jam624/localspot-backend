/**
 * Business sub-resource handlers and additional public routes.
 * These are appended to the existing publicRouter in business.routes.js.
 *
 * Adds:
 *   GET /businesses/nearby
 *   GET /businesses/search
 *   GET /businesses/search/suggestions
 *   GET /businesses/:id/services
 *   GET /businesses/:id/amenities
 *   GET /businesses/:id/hours
 *   GET /businesses/:id/media
 *   GET /businesses/:id/promotions
 *   GET /businesses/:id/related
 */

import { query } from "../../config/db.js";
import { badRequest, notFound } from "../../utils/errors.js";

function toNum(v) { return Number(v ?? 0); }

// resolve a business by numeric ID that is published/active
async function requirePublicBusiness(id) {
  if (!id || isNaN(Number(id))) throw badRequest("id must be a numeric business id");
  const rows = await query(
    `SELECT id, name, slug, category_id, city, area, listing_status FROM businesses
     WHERE id = ? AND listing_status IN ('published','active')
     LIMIT 1`,
    [Number(id)]
  );
  if (!rows.length) throw notFound("Business not found");
  return rows[0];
}

// ─── /businesses/nearby ───────────────────────────────────────────────────────
export async function getNearby(req, res, next) {
  try {
    const { latitude, longitude, radius = 5000, limit = 20, page = 1 } = req.query;

    if (!latitude || !longitude)
      return res.status(400).json({ message: "latitude and longitude are required" });

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseFloat(radius); // metres
    const lim = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const pg = Math.max(1, parseInt(page) || 1);
    const offset = (pg - 1) * lim;

    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ message: "Invalid coordinates" });

    // Haversine formula in MySQL/MariaDB
    const sql = `
      SELECT id, name, slug, description, city, area, average_rating, review_count,
             price_range, is_featured, phone, whatsapp, latitude, longitude,
             (6371000 * 2 * ASIN(SQRT(
               POWER(SIN((RADIANS(latitude) - RADIANS(?)) / 2), 2) +
               COS(RADIANS(?)) * COS(RADIANS(latitude)) *
               POWER(SIN((RADIANS(longitude) - RADIANS(?)) / 2), 2)
             ))) AS distance_m
      FROM businesses
      WHERE listing_status IN ('published','active')
        AND latitude IS NOT NULL AND longitude IS NOT NULL
      HAVING distance_m <= ?
      ORDER BY distance_m ASC
      LIMIT ? OFFSET ?`;

    const rows = await query(sql, [lat, lat, lon, rad, lim, offset]);

    return res.status(200).json({
      data: rows.map((r) => ({ ...r, distanceM: Math.round(toNum(r.distance_m)) })),
      meta: { latitude: lat, longitude: lon, radiusM: rad, page: pg, limit: lim },
    });
  } catch (e) { return next(e); }
}

// ─── /businesses/search (dedicated endpoint) ──────────────────────────────────
// The existing GET /businesses already supports search params; this just re-exports
// a cleaner endpoint at /businesses/search with the same logic.
export async function searchBusinesses(req, res, next) {
  try {
    const {
      q, category, location, rating, priceRange, openNow,
      sort = "recommended", page = 1, limit = 20,
    } = req.query;

    const pg = Math.max(1, parseInt(page) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (pg - 1) * lim;

    const conditions = ["b.listing_status IN ('published','active')"];
    const params = [];

    if (q) {
      conditions.push("MATCH(b.name, b.description, b.area, b.city) AGAINST(? IN BOOLEAN MODE)");
      params.push(`${q}*`);
    }
    if (category) {
      const isId = /^\d+$/.test(category);
      if (isId) { conditions.push("b.category_id = ?"); params.push(Number(category)); }
      else { conditions.push("c.slug = ?"); params.push(category); }
    }
    if (location) {
      conditions.push("(b.city LIKE ? OR b.area LIKE ?)");
      params.push(`%${location}%`, `%${location}%`);
    }
    if (rating) { conditions.push("b.average_rating >= ?"); params.push(parseFloat(rating)); }
    if (priceRange) { conditions.push("b.price_range = ?"); params.push(parseInt(priceRange)); }

    const orderMap = {
      recommended: "b.is_featured DESC, b.average_rating DESC, b.review_count DESC",
      rated: "b.average_rating DESC, b.review_count DESC",
      popular: "b.review_count DESC, b.average_rating DESC",
      newest: "b.created_at DESC",
    };
    const orderBy = orderMap[sort] || orderMap.recommended;
    const where = `WHERE ${conditions.join(" AND ")}`;

    const [{ total }] = await query(
      `SELECT COUNT(*) AS total FROM businesses b LEFT JOIN categories c ON c.id = b.category_id ${where}`,
      params
    );

    const rows = await query(
      `SELECT b.id, b.name, b.slug, b.description, b.city, b.area,
              b.average_rating, b.review_count, b.price_range, b.is_featured,
              b.phone, b.whatsapp, b.website, b.listing_status,
              c.name AS category_name, c.slug AS category_slug
       FROM businesses b
       LEFT JOIN categories c ON c.id = b.category_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, lim, offset]
    );

    return res.status(200).json({
      data: rows,
      pagination: { page: pg, limit: lim, total: toNum(total), totalPages: Math.ceil(toNum(total) / lim) },
    });
  } catch (e) { return next(e); }
}

// ─── /businesses/search/suggestions ──────────────────────────────────────────
export async function searchSuggestions(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(200).json({ data: [] });

    const rows = await query(
      `SELECT id, name, slug, city, area FROM businesses
       WHERE listing_status IN ('published','active')
         AND name LIKE ?
       ORDER BY average_rating DESC
       LIMIT 8`,
      [`${q}%`]
    );

    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}

// ─── Sub-resource handlers ────────────────────────────────────────────────────

export async function getServices(req, res, next) {
  try {
    const biz = await requirePublicBusiness(req.params.id);
    const rows = await query(
      `SELECT id, name, description, price FROM business_services
       WHERE business_id = ? AND is_active = 1 ORDER BY id ASC`,
      [biz.id]
    );
    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}

export async function getAmenities(req, res, next) {
  try {
    const biz = await requirePublicBusiness(req.params.id);
    const rows = await query(
      `SELECT a.id, a.name, a.slug FROM amenities a
       JOIN business_amenities ba ON ba.amenity_id = a.id
       WHERE ba.business_id = ? ORDER BY a.name ASC`,
      [biz.id]
    );
    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}

export async function getHours(req, res, next) {
  try {
    const biz = await requirePublicBusiness(req.params.id);
    const rows = await query(
      `SELECT day_of_week, opens_at, closes_at, is_closed
       FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC`,
      [biz.id]
    );
    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}

export async function getMedia(req, res, next) {
  try {
    const biz = await requirePublicBusiness(req.params.id);
    const rows = await query(
      `SELECT id, media_type, url, alt_text, sort_order
       FROM business_media WHERE business_id = ? AND is_active = 1
       ORDER BY sort_order ASC, id ASC`,
      [biz.id]
    );
    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}

export async function getBusinessPromotions(req, res, next) {
  try {
    const biz = await requirePublicBusiness(req.params.id);
    const rows = await query(
      `SELECT id, title, slug, description, discount_label, starts_at, ends_at, status
       FROM promotions
       WHERE business_id = ? AND status = 'active' AND ends_at > NOW()
       ORDER BY ends_at ASC`,
      [biz.id]
    );
    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}

export async function getRelatedBusinesses(req, res, next) {
  try {
    const biz = await requirePublicBusiness(req.params.id);
    const rows = await query(
      `SELECT id, name, slug, description, city, area, average_rating, price_range, is_featured
       FROM businesses
       WHERE category_id = ? AND id != ? AND listing_status IN ('published','active')
       ORDER BY average_rating DESC, is_featured DESC
       LIMIT 6`,
      [biz.category_id, biz.id]
    );
    return res.status(200).json({ data: rows });
  } catch (e) { return next(e); }
}
