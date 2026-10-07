import { query } from "../../config/db.js";
import { notFound, badRequest, forbidden } from "../../utils/errors.js";

function toNum(v) { return Number(v ?? 0); }

// helper: resolve the business for this account; throws 404 if none
export async function requireBusiness(accountId) {
  const rows = await query(
    `SELECT * FROM businesses WHERE account_id = ? LIMIT 1`,
    [accountId]
  );
  if (!rows.length) throw notFound("No business listing found. Create one via POST /api/v1/portal/businesses first.");
  return rows[0];
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getBusinessDashboard(accountId) {
  const biz = await requireBusiness(accountId);
  const id = biz.id;

  const period = "30d";
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceStr = since.toISOString().slice(0, 19).replace("T", " ");

  const eventQ = (type) =>
    query(
      `SELECT COUNT(*) AS total FROM events WHERE business_id = ? AND event_type = ? AND created_at >= ?`,
      [id, type, sinceStr]
    );

  const [[views], [searches], [phones], [whatsapps], [websites], [directions], [favAdds]] =
    await Promise.all([
      eventQ("business_view"),
      eventQ("search"),
      eventQ("phone_click"),
      eventQ("whatsapp_click"),
      eventQ("website_click"),
      eventQ("directions_click"),
      eventQ("favorite_add"),
    ]);

  const [[adImpressions], [adClicks]] = await Promise.all([
    query(
      `SELECT COUNT(*) AS total FROM events WHERE advertisement_id IN
       (SELECT id FROM advertisements WHERE business_id = ?) AND event_type = 'advertisement_impression' AND created_at >= ?`,
      [id, sinceStr]
    ),
    query(
      `SELECT COUNT(*) AS total FROM events WHERE advertisement_id IN
       (SELECT id FROM advertisements WHERE business_id = ?) AND event_type = 'advertisement_click' AND created_at >= ?`,
      [id, sinceStr]
    ),
  ]);

  return {
    period,
    profileViews: toNum(views.total),
    searchAppearances: toNum(searches.total),
    phoneClicks: toNum(phones.total),
    whatsappClicks: toNum(whatsapps.total),
    websiteClicks: toNum(websites.total),
    directionClicks: toNum(directions.total),
    favorites: toNum(favAdds.total),
    adImpressions: toNum(adImpressions.total),
    adClicks: toNum(adClicks.total),
    listingStatus: biz.listing_status,
    isFeatured: Boolean(biz.is_featured),
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function fmtBusiness(b) {
  return {
    id: toNum(b.id),
    name: b.name,
    slug: b.slug,
    description: b.description,
    phone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    website: b.website,
    address: b.address,
    city: b.city,
    area: b.area,
    state: b.state,
    country: b.country,
    latitude: b.latitude ? Number(b.latitude) : null,
    longitude: b.longitude ? Number(b.longitude) : null,
    priceRange: b.price_range,
    averageRating: Number(b.average_rating),
    reviewCount: toNum(b.review_count),
    isFeatured: Boolean(b.is_featured),
    listingStatus: b.listing_status,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

export async function getProfile(accountId) {
  const biz = await requireBusiness(accountId);
  return fmtBusiness(biz);
}

export async function updateProfile(accountId, body) {
  const biz = await requireBusiness(accountId);
  const allowed = ["name", "description", "price_range"];
  const updates = [];
  const params = [];

  for (const field of allowed) {
    const camel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const val = body[camel] ?? body[field];
    if (val !== undefined) {
      updates.push(`${field} = ?`);
      params.push(val);
    }
  }
  if (!updates.length) throw badRequest("No updatable fields provided");

  params.push(biz.id);
  await query(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`, params);
  const [row] = await query(`SELECT * FROM businesses WHERE id = ? LIMIT 1`, [biz.id]);
  return { message: "Profile updated", business: fmtBusiness(row) };
}

export async function updateContact(accountId, body) {
  const biz = await requireBusiness(accountId);
  const fields = ["phone", "whatsapp", "email", "website"];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
  }
  if (!updates.length) throw badRequest("No contact fields provided");

  params.push(biz.id);
  await query(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`, params);
  return { message: "Contact updated" };
}

export async function updateLocation(accountId, body) {
  const biz = await requireBusiness(accountId);
  const fields = ["address", "city", "area", "state", "country", "latitude", "longitude"];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]); }
  }
  if (!updates.length) throw badRequest("No location fields provided");

  params.push(biz.id);
  await query(`UPDATE businesses SET ${updates.join(", ")} WHERE id = ?`, params);
  return { message: "Location updated" };
}

// ─── Hours ────────────────────────────────────────────────────────────────────

export async function updateHours(accountId, hours) {
  const biz = await requireBusiness(accountId);

  if (!Array.isArray(hours) || !hours.length) throw badRequest("hours must be a non-empty array");

  // upsert each day row
  for (const h of hours) {
    const dayOfWeek = h.dayOfWeek ?? h.day_of_week;
    const opensAt = h.opensAt ?? h.openTime ?? h.open ?? h.opens_at ?? null;
    const closesAt = h.closesAt ?? h.closeTime ?? h.close ?? h.closes_at ?? null;
    const isClosed = h.isClosed ?? h.closed ?? h.is_closed ?? false;
    if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6)
      throw badRequest("Each hour entry needs dayOfWeek 0–6 (0=Sunday)");

    await query(
      `INSERT INTO business_hours (business_id, day_of_week, opens_at, closes_at, is_closed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE opens_at = VALUES(opens_at), closes_at = VALUES(closes_at), is_closed = VALUES(is_closed)`,
      [biz.id, dayOfWeek, opensAt || null, closesAt || null, isClosed ? 1 : 0]
    );
  }

  const rows = await query(
    `SELECT * FROM business_hours WHERE business_id = ? ORDER BY day_of_week ASC`,
    [biz.id]
  );
  return { message: "Hours updated", hours: rows };
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function updateServices(accountId, services) {
  const biz = await requireBusiness(accountId);

  if (!Array.isArray(services)) throw badRequest("services must be an array");

  // replace all services for this business
  await query(`DELETE FROM business_services WHERE business_id = ?`, [biz.id]);

  for (const s of services) {
    const { name, description = null, price = null, isActive = true } = s;
    if (!name) throw badRequest("Each service requires a name");
    await query(
      `INSERT INTO business_services (business_id, name, description, price, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [biz.id, name, description, price, isActive ? 1 : 0]
    );
  }

  const rows = await query(
    `SELECT * FROM business_services WHERE business_id = ? ORDER BY id ASC`,
    [biz.id]
  );
  return { message: "Services updated", services: rows };
}

// ─── Amenities ───────────────────────────────────────────────────────────────

export async function updateAmenities(accountId, amenityIds) {
  const biz = await requireBusiness(accountId);

  if (!Array.isArray(amenityIds)) throw badRequest("amenityIds must be an array of integers");

  await query(`DELETE FROM business_amenities WHERE business_id = ?`, [biz.id]);

  for (const amenityId of amenityIds) {
    const id = Number(amenityId);
    if (!Number.isInteger(id) || id <= 0) throw badRequest(`Invalid amenityId: ${amenityId}`);
    await query(
      `INSERT IGNORE INTO business_amenities (business_id, amenity_id) VALUES (?, ?)`,
      [biz.id, id]
    );
  }

  const rows = await query(
    `SELECT a.id, a.name, a.slug FROM amenities a
     JOIN business_amenities ba ON ba.amenity_id = a.id
     WHERE ba.business_id = ?
     ORDER BY a.name ASC`,
    [biz.id]
  );
  return { message: "Amenities updated", amenities: rows };
}

// ─── Media ────────────────────────────────────────────────────────────────────

const VALID_MEDIA_TYPES = ["logo", "cover", "gallery", "advertisement", "promotion"];

export async function listMedia(accountId) {
  const biz = await requireBusiness(accountId);
  const rows = await query(
    `SELECT * FROM business_media WHERE business_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC`,
    [biz.id]
  );
  return { data: rows };
}

export async function addMedia(accountId, body) {
  const biz = await requireBusiness(accountId);
  const { url, mediaType = "gallery", altText = null, sortOrder = 0 } = body;

  if (!url || typeof url !== "string") throw badRequest("url is required");
  if (!VALID_MEDIA_TYPES.includes(mediaType))
    throw badRequest(`mediaType must be one of: ${VALID_MEDIA_TYPES.join(", ")}`);

  const result = await query(
    `INSERT INTO business_media (business_id, media_type, url, alt_text, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [biz.id, mediaType, url, altText, sortOrder]
  );

  const [row] = await query(`SELECT * FROM business_media WHERE id = ?`, [result.insertId]);
  return { message: "Media added", media: row };
}

export async function updateMedia(accountId, mediaId, body) {
  const biz = await requireBusiness(accountId);
  const [existing] = await query(
    `SELECT * FROM business_media WHERE id = ? AND business_id = ? LIMIT 1`,
    [mediaId, biz.id]
  );
  if (!existing) throw notFound("Media not found");

  const { altText, sortOrder, isActive } = body;
  const updates = [];
  const params = [];
  if (altText !== undefined) { updates.push("alt_text = ?"); params.push(altText); }
  if (sortOrder !== undefined) { updates.push("sort_order = ?"); params.push(Number(sortOrder)); }
  if (isActive !== undefined) { updates.push("is_active = ?"); params.push(isActive ? 1 : 0); }
  if (!updates.length) throw badRequest("No fields to update");

  params.push(mediaId, biz.id);
  await query(`UPDATE business_media SET ${updates.join(", ")} WHERE id = ? AND business_id = ?`, params);
  const [row] = await query(`SELECT * FROM business_media WHERE id = ?`, [mediaId]);
  return { message: "Media updated", media: row };
}

export async function deleteMedia(accountId, mediaId) {
  const biz = await requireBusiness(accountId);
  const result = await query(
    `DELETE FROM business_media WHERE id = ? AND business_id = ?`,
    [mediaId, biz.id]
  );
  if (!result.affectedRows) throw notFound("Media not found");
  return { message: "Media deleted" };
}

// ─── Listing submission ───────────────────────────────────────────────────────

export async function submitListing(accountId) {
  const biz = await requireBusiness(accountId);
  const SUBMITTABLE = ["draft", "rejected"];
  if (!SUBMITTABLE.includes(biz.listing_status))
    throw badRequest(`Cannot submit a listing with status '${biz.listing_status}'`);

  await query(
    `UPDATE businesses SET listing_status = 'pending_approval' WHERE id = ?`,
    [biz.id]
  );
  return { message: "Listing submitted for review", listingStatus: "pending_approval" };
}

export async function getListingStatus(accountId) {
  const biz = await requireBusiness(accountId);
  return {
    listingStatus: biz.listing_status,
    rejectionReason: biz.rejection_reason ?? null,
    approvedAt: biz.approved_at ?? null,
    publishedAt: biz.published_at ?? null,
  };
}

export async function resubmitListing(accountId) {
  const biz = await requireBusiness(accountId);
  if (biz.listing_status !== "rejected")
    throw badRequest("Only rejected listings can be resubmitted");

  await query(
    `UPDATE businesses SET listing_status = 'pending_approval', rejection_reason = NULL WHERE id = ?`,
    [biz.id]
  );
  return { message: "Listing resubmitted for review", listingStatus: "pending_approval" };
}
