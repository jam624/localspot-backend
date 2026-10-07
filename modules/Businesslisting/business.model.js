import crypto from "node:crypto";
import pool from "../../config/db.js";
import { getLocalDayAndMinute } from "./openingHours.js";

export const STATUS = ["draft", "submitted", "pending_approval", "approved", "published", "rejected", "suspended", "active", "inactive"];
export const TRANSITIONS = {
  draft: ["submitted", "pending_approval"],
  submitted: ["pending_approval", "approved", "rejected"],
  pending_approval: ["approved", "rejected"],
  approved: ["published", "rejected"],
  published: ["approved", "suspended"],
  rejected: ["draft", "pending_approval"],
  suspended: ["approved"],
};

const BASE_SELECT = `
  SELECT b.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
    (SELECT m.url FROM business_media m WHERE m.business_id = b.id AND m.media_type = 'logo' AND m.is_active = 1 ORDER BY m.sort_order LIMIT 1) AS logo_url,
    (SELECT m.url FROM business_media m WHERE m.business_id = b.id AND m.media_type = 'cover' AND m.is_active = 1 ORDER BY m.sort_order LIMIT 1) AS cover_url
  FROM businesses b LEFT JOIN categories c ON c.id = b.category_id`;
const editableColumns = {
  name: "name", category: "category_id", description: "description", phone: "phone",
  whatsapp: "whatsapp", email: "email", website: "website", address: "address",
  city: "city", area: "area", priceRange: "price_range",
};
const slugify = (s) => String(s || "business").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "business";
const toMinutes = (value) => {
  if (value == null) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return hours * 60 + minutes;
};
const toTime = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}:00`;

function mapRow(row) {
  return {
    id: Number(row.id), ownerId: row.account_id == null ? null : Number(row.account_id),
    category: row.category_id == null ? null : { id: Number(row.category_id), name: row.category_name, slug: row.category_slug, icon: row.category_icon || null },
    name: row.name, slug: row.slug, description: row.description, phone: row.phone,
    whatsapp: row.whatsapp, email: row.email, website: row.website, address: row.address,
    city: row.city, area: row.area, state: row.state, country: row.country,
    location: row.latitude == null || row.longitude == null ? null : { lat: Number(row.latitude), lng: Number(row.longitude) },
    priceRange: row.price_range == null ? null : Number(row.price_range),
    rating: Number(row.average_rating) || 0, ratingCount: Number(row.review_count) || 0,
    logo: row.logo_url || null, coverImage: row.cover_url || null,
    status: row.listing_status, statusReason: row.rejection_reason,
    isActive: !["inactive", "suspended"].includes(row.listing_status), isFeatured: Boolean(row.is_featured),
    publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function attachRelations(items, { details = false } = {}) {
  if (!items.length) return items;
  const ids = items.map((item) => item.id);
  const marks = ids.map(() => "?").join(",");
  const [hours] = await pool.execute(`SELECT business_id, day_of_week, opens_at, closes_at, is_closed FROM business_hours WHERE business_id IN (${marks}) ORDER BY day_of_week`, ids);
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const row of hours) {
    const list = byId.get(Number(row.business_id)).hours || (byId.get(Number(row.business_id)).hours = []);
    if (!row.is_closed) list.push({ day: Number(row.day_of_week), open: toMinutes(row.opens_at), close: toMinutes(row.closes_at) });
  }
  if (details) {
    const [services] = await pool.execute(`SELECT business_id, name FROM business_services WHERE business_id IN (${marks}) AND is_active = 1 ORDER BY name`, ids);
    const [amenities] = await pool.execute(`SELECT ba.business_id, a.name FROM business_amenities ba JOIN amenities a ON a.id = ba.amenity_id WHERE ba.business_id IN (${marks}) ORDER BY a.name`, ids);
    const [gallery] = await pool.execute(`SELECT business_id, url, alt_text FROM business_media WHERE business_id IN (${marks}) AND media_type = 'gallery' AND is_active = 1 ORDER BY sort_order`, ids);
    for (const item of items) Object.assign(item, { services: [], amenities: [], gallery: [] });
    services.forEach((row) => byId.get(Number(row.business_id)).services.push(row.name));
    amenities.forEach((row) => byId.get(Number(row.business_id)).amenities.push(row.name));
    gallery.forEach((row) => byId.get(Number(row.business_id)).gallery.push({ url: row.url, altText: row.alt_text }));
  }
  return items;
}

export async function findById(id, { accountId, publicOnly = false } = {}) {
  const where = ["b.id = ?"];
  const params = [id];
  if (accountId !== undefined) { where.push("b.account_id = ?"); params.push(accountId); }
  if (publicOnly) where.push("b.listing_status = 'published'");
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE ${where.join(" AND ")} LIMIT 1`, params);
  if (!rows.length) return null;
  return (await attachRelations([mapRow(rows[0])], { details: true }))[0];
}

export async function findPublicBySlug(slug) {
  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE b.slug = ? AND b.listing_status IN ('published', 'active') LIMIT 1`,
    [slug],
  );
  if (!rows.length) return null;
  return (await attachRelations([mapRow(rows[0])], { details: true }))[0];
}

/**
 * Public lookup by numeric id OR slug (README: GET /api/v1/businesses/:businessId).
 * Only published/active listings are returned.
 */
export async function findPublicByIdOrSlug(idOrSlug) {
  const isNumeric = /^\d+$/.test(String(idOrSlug));
  if (isNumeric) {
    const [rows] = await pool.execute(
      `${BASE_SELECT} WHERE b.id = ? AND b.listing_status IN ('published', 'active') LIMIT 1`,
      [Number(idOrSlug)],
    );
    if (!rows.length) return null;
    return (await attachRelations([mapRow(rows[0])], { details: true }))[0];
  }
  const [rows] = await pool.execute(
    `${BASE_SELECT} WHERE b.slug = ? AND b.listing_status IN ('published', 'active') LIMIT 1`,
    [idOrSlug],
  );
  if (!rows.length) return null;
  return (await attachRelations([mapRow(rows[0])], { details: true }))[0];
}

export async function listByOwner(accountId) {
  const [rows] = await pool.execute(`${BASE_SELECT} WHERE b.account_id = ? ORDER BY b.updated_at DESC`, [accountId]);
  return attachRelations(rows.map(mapRow));
}

export async function adminList({ q, status, page, limit }) {
  const where = ["1 = 1"];
  const params = [];
  if (status) { where.push("b.listing_status = ?"); params.push(status); }
  if (q) { where.push("b.name LIKE ?"); params.push(`%${q}%`); }
  const condition = where.join(" AND ");
  const [[countRows], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM businesses b WHERE ${condition}`, params),
    pool.execute(`${BASE_SELECT} WHERE ${condition} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
  ]);
  return { items: await attachRelations(rows.map(mapRow)), total: Number(countRows[0].total) };
}

export async function searchPublic(filters) {
  const where = ["b.listing_status = 'published'", "b.category_id IS NOT NULL"];
  const params = [];
  if (filters.q) { where.push("(b.name LIKE ? OR b.description LIKE ?)"); params.push(`%${filters.q}%`, `%${filters.q}%`); }
  if (filters.category) { where.push("(c.id = ? OR c.slug = ?)"); params.push(filters.category, filters.category); }
  for (const field of ["city", "area"]) if (filters[field]) { where.push(`b.${field} = ?`); params.push(filters[field]); }
  if (filters.minRating !== undefined) { where.push("b.average_rating >= ?"); params.push(filters.minRating); }
  if (filters.minPrice !== undefined) { where.push("b.price_range >= ?"); params.push(filters.minPrice); }
  if (filters.maxPrice !== undefined) { where.push("b.price_range <= ?"); params.push(filters.maxPrice); }
  if (filters.openNow) {
    const { day, minute } = getLocalDayAndMinute();
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`;
    where.push(`EXISTS (SELECT 1 FROM business_hours h WHERE h.business_id = b.id AND h.day_of_week = ? AND h.is_closed = 0 AND ((h.opens_at < h.closes_at AND ? >= h.opens_at AND ? < h.closes_at) OR (h.opens_at >= h.closes_at AND (? >= h.opens_at OR ? < h.closes_at))))`);
    params.push(day, time, time, time, time);
  }
  if (filters.lat !== undefined) {
    const distance = "(6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(b.latitude)) * COS(RADIANS(b.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(b.latitude)))))";
    where.push(`b.latitude IS NOT NULL AND b.longitude IS NOT NULL AND ${distance} <= ?`);
    params.push(filters.lat, filters.lng, filters.lat, filters.radiusKm);
  }
  const clause = where.join(" AND ");
  const sorts = { recommended: "b.is_featured DESC, b.average_rating DESC, b.review_count DESC", rated: "b.average_rating DESC, b.review_count DESC", popular: "b.review_count DESC", newest: "b.published_at DESC" };
  const [[countRows], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM businesses b LEFT JOIN categories c ON c.id = b.category_id WHERE ${clause}`, params),
    pool.execute(`${BASE_SELECT} WHERE ${clause} ORDER BY ${sorts[filters.sort] || sorts.recommended} LIMIT ? OFFSET ?`, [...params, filters.limit, (filters.page - 1) * filters.limit]),
  ]);
  return { items: await attachRelations(rows.map(mapRow)), total: Number(countRows[0].total) };
}

async function writeChildren(conn, id, data) {
  if (data.hours !== undefined) {
    await conn.execute("DELETE FROM business_hours WHERE business_id = ?", [id]);
    if (data.hours.length) await conn.query("INSERT INTO business_hours (business_id, day_of_week, opens_at, closes_at, is_closed) VALUES ?", [data.hours.map((h) => [id, h.day, toTime(h.open), toTime(h.close), 0])]);
  }
  if (data.services !== undefined) {
    await conn.execute("DELETE FROM business_services WHERE business_id = ?", [id]);
    if (data.services.length) await conn.query("INSERT INTO business_services (business_id, name) VALUES ?", [[...new Set(data.services)].map((name) => [id, name])]);
  }
  if (data.amenities !== undefined) {
    await conn.execute("DELETE FROM business_amenities WHERE business_id = ?", [id]);
    for (const name of new Set(data.amenities)) {
      const amenitySlug = slugify(name);
      const [result] = await conn.execute("INSERT INTO amenities (name, slug) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)", [name, amenitySlug]);
      await conn.execute("INSERT IGNORE INTO business_amenities (business_id, amenity_id) VALUES (?, ?)", [id, result.insertId]);
    }
  }
  for (const [key, type] of [["logo", "logo"], ["coverImage", "cover"], ["gallery", "gallery"]]) {
    if (data[key] === undefined) continue;
    await conn.execute("DELETE FROM business_media WHERE business_id = ? AND media_type = ?", [id, type]);
    const media = key === "gallery" ? data[key] : data[key] ? [data[key]] : [];
    if (media.length) await conn.query("INSERT INTO business_media (business_id, media_type, url, alt_text, sort_order) VALUES ?", [media.map((item, index) => [id, type, item.url, item.altText || null, index])]);
  }
}

export async function create(data, { accountId = null, publish = false, adminId = null } = {}) {
  const conn = await pool.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    const slug = `${slugify(data.name)}-${crypto.randomBytes(3).toString("hex")}`;
    const [result] = await conn.execute(
      `INSERT INTO businesses (account_id, category_id, name, slug, description, phone, whatsapp, email, website, address, city, area, latitude, longitude, price_range, listing_status, approved_by, approved_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [accountId, data.category ?? null, data.name, slug, data.description ?? null, data.phone ?? null, data.whatsapp ?? null, data.email ?? null, data.website ?? null, data.address ?? null, data.city || "Port Harcourt", data.area ?? null, data.location?.lat ?? null, data.location?.lng ?? null, data.priceRange ?? null, publish ? "published" : "draft", publish ? adminId : null, publish ? new Date() : null, publish ? new Date() : null]
    );
    id = result.insertId;
    await writeChildren(conn, id, data);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
  return findById(id);
}

export async function update(id, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sets = [];
    const values = [];
    for (const [key, column] of Object.entries(editableColumns)) if (data[key] !== undefined) { sets.push(`${column} = ?`); values.push(data[key]); }
    if (data.location !== undefined) { sets.push("latitude = ?", "longitude = ?"); values.push(data.location?.lat ?? null, data.location?.lng ?? null); }
    if (sets.length) await conn.execute(`UPDATE businesses SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
    await writeChildren(conn, id, data);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
  return findById(id);
}

export async function setStatus(id, from, to, reason = null, adminId = null) {
  const fields = ["listing_status = ?", "rejection_reason = ?"];
  const values = [to, ["rejected", "suspended"].includes(to) ? reason : null];
  if (to === "approved") { fields.push("approved_by = ?", "approved_at = CURRENT_TIMESTAMP"); values.push(adminId); }
  if (to === "published") fields.push("published_at = COALESCE(published_at, CURRENT_TIMESTAMP)");
  const [result] = await pool.execute(`UPDATE businesses SET ${fields.join(", ")} WHERE id = ? AND listing_status = ?`, [...values, id, from]);
  return result.affectedRows === 1;
}

export async function setActive(id, active) {
  const [result] = await pool.execute("UPDATE businesses SET listing_status = ? WHERE id = ?", [active ? "published" : "inactive", id]);
  return result.affectedRows === 1;
}

export async function incrementViews(id) {
  await pool.execute("INSERT INTO events (event_type, business_id) VALUES ('business_view', ?)", [id]);
}

export function missingFields(business) {
  const fields = ["name", "description", "phone", "address", "city", "area"].filter((key) => !business[key]);
  if (!business.category?.id) fields.push("category");
  if (!business.location) fields.push("location");
  return fields;
}
