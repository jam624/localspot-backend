import { STATUS } from "./business.model.js";

const allowedFields = new Set(["name", "category", "description", "phone", "whatsapp", "email", "website", "address", "city", "area", "location", "hours", "priceRange", "services", "amenities", "logo", "coverImage", "gallery"]);
const fail = (res, message, field) => res.status(400).json({ success: false, message, ...(field ? { field } : {}) });
const isText = (v, min, max) => typeof v === "string" && v.trim().length >= min && v.trim().length <= max;

function validateBody(req, res, next, { partial = false, admin = false } = {}) {
  const body = req.body || {};
  const data = { ...body };
  if (Object.keys(body).some((key) => !allowedFields.has(key) && !(admin && ["owner", "publish"].includes(key)))) return fail(res, "Unknown request field");
  if ((!partial && !isText(data.name, 2, 180)) || (data.name !== undefined && !isText(data.name, 2, 180))) return fail(res, "name must be 2 to 180 characters", "name");
  if ((!partial && !Number.isInteger(Number(data.category))) || (data.category !== undefined && (!Number.isInteger(Number(data.category)) || Number(data.category) < 1))) return fail(res, "category must be a positive integer", "category");
  if (data.category !== undefined) data.category = Number(data.category);
  if (data.owner !== undefined) {
    if (!admin || !Number.isInteger(Number(data.owner)) || Number(data.owner) < 1) return fail(res, "owner must be a positive account id", "owner");
    data.owner = Number(data.owner);
  }
  if (data.publish !== undefined && (typeof data.publish !== "boolean" || !admin)) return fail(res, "publish must be a boolean", "publish");
  const textLimits = { description: [0, 5000], phone: [0, 40], whatsapp: [0, 40], email: [0, 180], website: [0, 255], address: [0, 255], city: [0, 120], area: [0, 120] };
  for (const [field, [min, max]] of Object.entries(textLimits)) if (data[field] !== undefined && (typeof data[field] !== "string" || data[field].trim().length > max || (min && data[field].trim().length < min))) return fail(res, `Invalid ${field}`, field);
  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) return fail(res, "Invalid email", "email");
  if (data.website && !/^https?:\/\//i.test(data.website)) return fail(res, "website must be an http(s) URL", "website");
  if (data.location !== undefined && data.location !== null && (!Number.isFinite(data.location.lat) || data.location.lat < -90 || data.location.lat > 90 || !Number.isFinite(data.location.lng) || data.location.lng < -180 || data.location.lng > 180)) return fail(res, "Invalid coordinates", "location");
  if (data.priceRange !== undefined && (!Number.isInteger(data.priceRange) || data.priceRange < 1 || data.priceRange > 4)) return fail(res, "priceRange must be between 1 and 4", "priceRange");
  if (data.hours !== undefined) {
    if (!Array.isArray(data.hours) || data.hours.some((h) => !Number.isInteger(h.day) || h.day < 0 || h.day > 6 || !Number.isInteger(h.open) || h.open < 0 || h.open > 1439 || !Number.isInteger(h.close) || h.close < 1 || h.close > 1440 || h.close <= h.open) || new Set(data.hours.map((h) => h.day)).size !== data.hours.length) return fail(res, "hours must contain at most one valid interval per day", "hours");
  }
  for (const field of ["services", "amenities"]) if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field].length > 50 || data[field].some((v) => !isText(v, 1, 160)))) return fail(res, `Invalid ${field}`, field);
  const image = (value) => value == null || (typeof value.url === "string" && /^https?:\/\//i.test(value.url) && value.url.length <= 500);
  if (["logo", "coverImage"].some((key) => data[key] !== undefined && !image(data[key]))) return fail(res, "Image values must include a valid http(s) url");
  if (data.gallery !== undefined && (!Array.isArray(data.gallery) || data.gallery.length > 20 || data.gallery.some((item) => !image(item)))) return fail(res, "Invalid gallery", "gallery");
  if (partial && !admin && Object.keys(data).length === 0) return fail(res, "Provide at least one field to update");
  req.valid = req.valid || {};
  req.valid.body = data;
  next();
}

export const validateCreate = (req, res, next) => validateBody(req, res, next);
export const validateUpdate = (req, res, next) => validateBody(req, res, next, { partial: true });
export const validateAdminCreate = (req, res, next) => validateBody(req, res, next, { admin: true });
export const validateAdminUpdate = (req, res, next) => validateBody(req, res, next, { partial: true, admin: true });

export function validateStatus(req, res, next) {
  const { status, reason } = req.body || {};
  if (!STATUS.includes(status) || (["rejected", "suspended"].includes(status) && !isText(reason, 3, 500))) return fail(res, "Invalid status or required reason");
  req.valid = { ...(req.valid || {}), body: { status, reason } };
  next();
}

export function validateActive(req, res, next) {
  if (typeof req.body?.isActive !== "boolean") return fail(res, "isActive must be a boolean");
  req.valid = { ...(req.valid || {}), body: { isActive: req.body.isActive } };
  next();
}

export function validateSearch(req, res, next) {
  const number = (name, min, max) => req.query[name] === undefined ? undefined : Number(req.query[name]);
  const page = number("page", 1), limit = number("limit", 1), minRating = number("minRating"), minPrice = number("minPrice"), maxPrice = number("maxPrice"), lat = number("lat"), lng = number("lng"), radiusKm = number("radiusKm");
  if ([page, limit].some((n) => n !== undefined && (!Number.isInteger(n) || n < 1)) || (limit && limit > 50) || [minRating, minPrice, maxPrice, lat, lng, radiusKm].some((n) => n !== undefined && !Number.isFinite(n)) || (minRating !== undefined && (minRating < 0 || minRating > 5)) || (minPrice !== undefined && (minPrice < 1 || minPrice > 4)) || (maxPrice !== undefined && (maxPrice < 1 || maxPrice > 4)) || (lat !== undefined && (lat < -90 || lat > 90)) || (lng !== undefined && (lng < -180 || lng > 180)) || ((lat === undefined) !== (lng === undefined)) || (radiusKm !== undefined && (radiusKm <= 0 || radiusKm > 100)) || (req.query.openNow !== undefined && !["true", "false"].includes(req.query.openNow))) return fail(res, "Invalid search filters");
  if (req.query.sort && !["recommended", "rated", "popular", "newest"].includes(req.query.sort)) return fail(res, "Invalid sort order", "sort");
  req.valid = { ...(req.valid || {}), query: { ...req.query, page: page || 1, limit: limit || 20, minRating, minPrice, maxPrice, lat, lng, radiusKm: radiusKm || 10, openNow: req.query.openNow === "true", sort: req.query.sort || "recommended" } };
  next();
}

export function validateId(req, res, next) {
  if (!/^[1-9]\d{0,17}$/.test(req.params.id)) return fail(res, "Invalid id");
  req.params.id = Number(req.params.id);
  next();
}

export function validateAdminList(req, res, next) {
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100 || (req.query.status && !STATUS.includes(req.query.status))) return fail(res, "Invalid pagination or status filter");
  req.valid = { ...(req.valid || {}), query: { q: req.query.q, status: req.query.status, page, limit } };
  next();
}
