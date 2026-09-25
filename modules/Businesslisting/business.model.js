const crypto = require('crypto');
// Your existing mysql2/promise pool, e.g. mysql.createPool({ ..., waitForConnections: true })
const pool = require('../config/db');

/** Listing lifecycle (PRD §16.3 / §24). "Active / Inactive" is the separate is_active flag. */
const STATUS = ['draft', 'submitted', 'pending_approval', 'approved', 'published', 'rejected', 'suspended'];

/** Every allowed transition. Anything not listed here is rejected. */
const TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['pending_approval', 'rejected'],
  pending_approval: ['approved', 'rejected'],
  approved: ['published', 'rejected'],
  published: ['approved', 'suspended'], // published -> approved = unpublish
  rejected: ['draft'],
  suspended: ['approved'], // reinstate, then publish again
};

// API field -> column, for simple scalar columns
const SCALAR_COLUMNS = {
  name: 'name',
  category: 'category_id',
  description: 'description',
  phone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  website: 'website',
  address: 'address',
  city: 'city',
  area: 'area',
  priceRange: 'price_range',
};

const BASE_SELECT = `
  SELECT b.*, c.name AS category_name, c.slug AS category_slug
  FROM businesses b
  JOIN categories c ON c.id = b.category_id`;

// ------------------------------------------------------------------ helpers

const num = (v) => (v == null ? v : Number(v));
const bool = (v) => (v == null ? undefined : !!v);
const likePattern = (s) => `%${s.replace(/[\\%_]/g, '\\$&')}%`;

function slugify(str) {
  return (
    String(str)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'business'
  );
}
// Generated once, never changed, so shared links survive a rename.
const newSlug = (name) => `${slugify(name)}-${crypto.randomBytes(3).toString('hex')}`;

/** DB row -> API object. Tolerates partial rows (list queries select fewer columns). */
function mapRow(r) {
  return {
    id: r.id,
    ownerId: r.owner_id,
    category: { id: r.category_id, name: r.category_name, slug: r.category_slug },
    name: r.name,
    slug: r.slug,
    description: r.description,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    website: r.website,
    address: r.address,
    city: r.city,
    area: r.area,
    location: r.latitude != null && r.longitude != null ? { lat: Number(r.latitude), lng: Number(r.longitude) } : null,
    priceRange: r.price_range,
    logo: r.logo_url ? { url: r.logo_url, publicId: r.logo_public_id } : null,
    coverImage: r.cover_url ? { url: r.cover_url, publicId: r.cover_public_id } : null,
    rating: num(r.rating),
    ratingCount: r.rating_count,
    viewCount: r.view_count,
    status: r.status,
    statusReason: r.status_reason,
    isActive: bool(r.is_active),
    isFeatured: bool(r.is_featured),
    isSponsored: bool(r.is_sponsored),
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Batch-loads hours (and optionally services/amenities/gallery) onto the given items. */
async function attachRelations(items, { extras = true } = {}) {
  if (!items.length) return items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const ids = [...byId.keys()];

  items.forEach((i) => {
    i.hours = [];
    if (extras) Object.assign(i, { services: [], amenities: [], gallery: [] });
  });

  const [hours] = await pool.query(
    'SELECT business_id, day, open_min, close_min FROM business_hours WHERE business_id IN (?) ORDER BY day, open_min',
    [ids]
  );
  hours.forEach((h) => byId.get(h.business_id).hours.push({ day: h.day, open: h.open_min, close: h.close_min }));

  if (extras) {
    const [attrs] = await pool.query(
      'SELECT business_id, type, name FROM business_attributes WHERE business_id IN (?) ORDER BY name',
      [ids]
    );
    attrs.forEach((a) => byId.get(a.business_id)[a.type === 'service' ? 'services' : 'amenities'].push(a.name));

    const [images] = await pool.query(
      'SELECT business_id, url, public_id FROM business_images WHERE business_id IN (?) ORDER BY position, id',
      [ids]
    );
    images.forEach((im) => byId.get(im.business_id).gallery.push({ url: im.url, publicId: im.public_id }));
  }
  return items;
}

/** API input -> businesses columns (only the keys that were provided). */
function toColumns(data) {
  const cols = {};
  for (const [key, col] of Object.entries(SCALAR_COLUMNS)) {
    if (data[key] !== undefined) cols[col] = data[key];
  }
  if (data.location) {
    cols.latitude = data.location.lat;
    cols.longitude = data.location.lng;
  }
  if (data.logo) {
    cols.logo_url = data.logo.url;
    cols.logo_public_id = data.logo.publicId ?? null;
  }
  if (data.coverImage) {
    cols.cover_url = data.coverImage.url;
    cols.cover_public_id = data.coverImage.publicId ?? null;
  }
  return cols;
}

/** Writes hours / services / amenities / gallery. Only touches collections present in `data`. */
async function writeChildren(conn, id, data, { replace }) {
  if (data.hours !== undefined) {
    if (replace) await conn.query('DELETE FROM business_hours WHERE business_id = ?', [id]);
    if (data.hours.length) {
      await conn.query('INSERT INTO business_hours (business_id, day, open_min, close_min) VALUES ?', [
        data.hours.map((h) => [id, h.day, h.open, h.close]),
      ]);
    }
  }
  for (const [key, type] of [['services', 'service'], ['amenities', 'amenity']]) {
    if (data[key] === undefined) continue;
    if (replace) await conn.query('DELETE FROM business_attributes WHERE business_id = ? AND type = ?', [id, type]);
    const names = [...new Set(data[key])];
    if (names.length) {
      await conn.query('INSERT INTO business_attributes (business_id, type, name) VALUES ?', [
        names.map((n) => [id, type, n]),
      ]);
    }
  }
  if (data.gallery !== undefined) {
    if (replace) await conn.query('DELETE FROM business_images WHERE business_id = ?', [id]);
    if (data.gallery.length) {
      await conn.query('INSERT INTO business_images (business_id, url, public_id, position) VALUES ?', [
        data.gallery.map((g, i) => [id, g.url, g.publicId ?? null, i]),
      ]);
    }
  }
}

async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ------------------------------------------------------------------ reads

async function findOne(whereSql, params) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE ${whereSql} LIMIT 1`, params);
  if (!rows.length) return null;
  const [item] = await attachRelations([mapRow(rows[0])]);
  return item;
}

/** opts: { ownerId, publicOnly } */
const findById = (id, { ownerId, publicOnly } = {}) => {
  const where = ['b.id = ?'];
  const params = [id];
  if (ownerId !== undefined) { where.push('b.owner_id = ?'); params.push(ownerId); }
  if (publicOnly) where.push("b.status = 'published' AND b.is_active = 1 AND c.is_active = 1");
  return findOne(where.join(' AND '), params);
};

const findPublicBySlug = (slug) =>
  findOne("b.slug = ? AND b.status = 'published' AND b.is_active = 1 AND c.is_active = 1", [slug]);

async function listByOwner(ownerId) {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE b.owner_id = ? ORDER BY b.updated_at DESC`, [ownerId]);
  return attachRelations(rows.map(mapRow), { extras: false });
}

async function adminList({ q, status, page, limit }) {
  const where = ['1 = 1'];
  const params = [];
  if (status) { where.push('b.status = ?'); params.push(status); }
  if (q) { where.push('b.name LIKE ?'); params.push(likePattern(q)); }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM businesses b WHERE ${where.join(' AND ')}`, params);
  const [rows] = await pool.query(
    `${BASE_SELECT} WHERE ${where.join(' AND ')} ORDER BY b.created_at DESC, b.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  return { items: await attachRelations(rows.map(mapRow), { extras: false }), total };
}

const SORTS = {
  // Sponsored, then featured, above organic results (PRD §11)
  recommended: 'b.is_sponsored DESC, b.is_featured DESC, b.rating DESC, b.view_count DESC, b.id DESC',
  rated: 'b.rating DESC, b.rating_count DESC, b.id DESC',
  popular: 'b.view_count DESC, b.id DESC',
  newest: 'b.published_at DESC, b.id DESC',
};

const LIST_COLUMNS = `
  b.id, b.name, b.slug, b.category_id, c.name AS category_name, c.slug AS category_slug,
  b.area, b.city, b.address, b.latitude, b.longitude, b.price_range, b.logo_url, b.cover_url,
  b.rating, b.rating_count, b.is_featured, b.is_sponsored`;

// Great-circle distance in km between (lat, lng) params and the row's coordinates
const DISTANCE_SQL = `6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(b.latitude)) *
  COS(RADIANS(b.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(b.latitude))))`;

/** Public search. `now` = { day, minute } in the platform timezone (see utils/openingHours). */
async function searchPublic(q, now) {
  const where = ["b.status = 'published'", 'b.is_active = 1', 'c.is_active = 1'];
  const params = [];

  if (q.category) {
    if (/^\d+$/.test(q.category)) { where.push('c.id = ?'); params.push(Number(q.category)); }
    else { where.push('c.slug = ?'); params.push(q.category.toLowerCase()); }
  }
  if (q.city) { where.push('b.city = ?'); params.push(q.city); }
  if (q.area) { where.push('b.area = ?'); params.push(q.area); }
  if (q.minRating !== undefined) { where.push('b.rating >= ?'); params.push(q.minRating); }
  if (q.minPrice !== undefined) { where.push('b.price_range >= ?'); params.push(q.minPrice); }
  if (q.maxPrice !== undefined) { where.push('b.price_range <= ?'); params.push(q.maxPrice); }

  if (q.q) {
    // Every word must match name, description, category or a service/amenity.
    for (const token of q.q.split(/\s+/).filter(Boolean).slice(0, 5)) {
      const like = likePattern(token);
      where.push(`(b.name LIKE ? OR b.description LIKE ? OR c.name LIKE ?
        OR EXISTS (SELECT 1 FROM business_attributes a WHERE a.business_id = b.id AND a.name LIKE ?))`);
      params.push(like, like, like, like);
    }
  }
  if (q.openNow) {
    where.push(`EXISTS (SELECT 1 FROM business_hours h
      WHERE h.business_id = b.id AND h.day = ? AND h.open_min <= ? AND h.close_min > ?)`);
    params.push(now.day, now.minute, now.minute);
  }
  if (q.lat !== undefined) {
    where.push('b.latitude IS NOT NULL AND b.longitude IS NOT NULL');
    where.push(`${DISTANCE_SQL} <= ?`);
    params.push(q.lat, q.lng, q.lat, q.radiusKm);
  }

  const whereSql = where.join(' AND ');
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM businesses b JOIN categories c ON c.id = b.category_id WHERE ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT ${LIST_COLUMNS} FROM businesses b JOIN categories c ON c.id = b.category_id
     WHERE ${whereSql} ORDER BY ${SORTS[q.sort]} LIMIT ? OFFSET ?`,
    [...params, q.limit, (q.page - 1) * q.limit]
  );
  return { items: await attachRelations(rows.map(mapRow), { extras: false }), total };
}

// ------------------------------------------------------------------ writes

/** opts: { ownerId, createdBy, status, publish } */
async function create(data, { ownerId = null, createdBy = null, publish = false } = {}) {
  const id = await withTransaction(async (conn) => {
    const cols = {
      ...toColumns(data),
      owner_id: ownerId,
      created_by: createdBy,
      status: publish ? 'published' : 'draft',
    };
    if (publish) cols.published_at = new Date();

    let insertId;
    for (let attempt = 0; ; attempt++) {
      try {
        const [res] = await conn.query('INSERT INTO businesses SET ?', [{ ...cols, slug: newSlug(data.name) }]);
        insertId = res.insertId;
        break;
      } catch (err) {
        // Extremely unlikely slug collision: retry with a new suffix
        if (err.code === 'ER_DUP_ENTRY' && /slug/.test(err.message) && attempt < 3) continue;
        throw err;
      }
    }
    await writeChildren(conn, insertId, data, { replace: false });
    return insertId;
  });
  return findById(id);
}

/** Partial update. `extraColumns` lets the controller set status fields in the same transaction. */
async function update(id, data, extraColumns = {}) {
  await withTransaction(async (conn) => {
    const cols = { ...toColumns(data), ...extraColumns };
    if (Object.keys(cols).length) await conn.query('UPDATE businesses SET ?, updated_at = NOW() WHERE id = ?', [cols, id]);
    else await conn.query('UPDATE businesses SET updated_at = NOW() WHERE id = ?', [id]);
    await writeChildren(conn, id, data, { replace: true });
  });
  return findById(id);
}

/**
 * Atomic status change: only succeeds if the row is still in `from`.
 * Returns false when it lost a race (someone else changed the status first).
 */
async function setStatus(id, from, to, reason) {
  const sets = ['status = ?', 'status_reason = ?'];
  const params = [to, ['rejected', 'suspended'].includes(to) ? reason || null : null];
  if (to === 'published') sets.push('published_at = COALESCE(published_at, NOW())');
  const [res] = await pool.query(`UPDATE businesses SET ${sets.join(', ')} WHERE id = ? AND status = ?`, [
    ...params, id, from,
  ]);
  return res.affectedRows === 1;
}

async function setActive(id, isActive) {
  const [res] = await pool.query('UPDATE businesses SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);
  return res.affectedRows === 1;
}

function incrementViews(id) {
  return pool.query('UPDATE businesses SET view_count = view_count + 1 WHERE id = ?', [id]);
}

const REQUIRED_FOR_SUBMISSION = ['name', 'description', 'phone', 'address', 'city', 'area'];

/** Names of required fields that are still empty on a mapped business. */
function missingFields(b) {
  const missing = REQUIRED_FOR_SUBMISSION.filter((f) => !b[f]);
  if (!b.category || !b.category.id) missing.push('category');
  if (!b.location) missing.push('location');
  return missing;
}

module.exports = {
  STATUS,
  TRANSITIONS,
  findById,
  findPublicBySlug,
  listByOwner,
  adminList,
  searchPublic,
  create,
  update,
  setStatus,
  setActive,
  incrementViews,
  missingFields,
};
