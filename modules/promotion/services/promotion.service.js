import { randomBytes } from "node:crypto";
import pool, { query } from "../../../config/db.js";
import { conflict, forbidden, notFound } from "../../../utils/errors.js";

const SELECT = `
  SELECT p.*, b.account_id, b.name AS business_name, b.slug AS business_slug,
    (SELECT bm.url FROM business_media bm
      WHERE bm.business_id = b.id AND bm.media_type = 'logo' AND bm.is_active = 1
      ORDER BY bm.sort_order LIMIT 1) AS business_logo
  FROM promotions p JOIN businesses b ON b.id = p.business_id`;

const promotionSlug = (title) => `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180) || "promotion"}-${randomBytes(4).toString("hex")}`;

async function findPromotion(id) {
  const rows = await query(`${SELECT} WHERE p.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function businessForAccount(accountId) {
  const rows = await query("SELECT id FROM businesses WHERE account_id = ? ORDER BY id LIMIT 1", [accountId]);
  return rows[0] || null;
}

export async function listPublicPromotions({ businessId, page = 1, limit = 20 } = {}) {
  const where = ["p.status = 'active'", "(p.starts_at IS NULL OR p.starts_at <= NOW())", "(p.ends_at IS NULL OR p.ends_at >= NOW())"];
  const params = [];
  if (businessId) { where.push("p.business_id = ?"); params.push(businessId); }
  const whereSql = where.join(" AND ");
  const [[{ total }], data] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM promotions p WHERE ${whereSql}`, params),
    query(`${SELECT} WHERE ${whereSql} ORDER BY p.starts_at DESC, p.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
  ]);
  return { data, pagination: { page, limit, total: Number(total) } };
}

export async function getPromotionById(id, { businessAccount, admin } = {}) {
  const promo = await findPromotion(id);
  if (!promo) throw notFound("Promotion not found");
  const isOwner = businessAccount && Number(promo.account_id) === Number(businessAccount.id);
  const visible = promo.status === "active" && (!promo.starts_at || new Date(promo.starts_at) <= new Date()) && (!promo.ends_at || new Date(promo.ends_at) >= new Date());
  if (!admin && !isOwner && !visible) throw notFound("Promotion not found");
  return promo;
}

export async function createPromotion(accountId, payload) {
  const business = await businessForAccount(accountId);
  if (!business) throw notFound("Business profile not found");
  const { title, description, imageUrl, discountLabel, startDate, endDate } = payload;
  const [result] = await pool.execute(
    `INSERT INTO promotions (business_id, title, slug, description, discount_label, image_url, starts_at, ends_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [business.id, title.trim(), promotionSlug(title), description?.trim() || null, discountLabel || null, imageUrl || null, startDate, endDate]
  );
  return findPromotion(result.insertId);
}

export async function updatePromotion(id, accountId, payload) {
  const promo = await findPromotion(id);
  if (!promo) throw notFound("Promotion not found");
  if (Number(promo.account_id) !== Number(accountId)) throw forbidden("Not your promotion");
  if (!["draft", "rejected"].includes(promo.status)) throw conflict("Only draft or rejected promotions can be edited");
  const startDate = payload.startDate ?? promo.starts_at;
  const endDate = payload.endDate ?? promo.ends_at;
  if (startDate && endDate && new Date(endDate) <= new Date(startDate)) throw conflict("End date must be after start date");

  const fields = { title: "title", description: "description", imageUrl: "image_url", discountLabel: "discount_label", startDate: "starts_at", endDate: "ends_at" };
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(fields)) {
    if (payload[key] !== undefined) { sets.push(`${column} = ?`); values.push(key === "title" || key === "description" ? payload[key].trim() : payload[key]); }
  }
  if (payload.title !== undefined) { sets.push("slug = ?"); values.push(promotionSlug(payload.title)); }
  if (!sets.length) throw conflict("Provide at least one field to update");
  sets.push("status = 'draft'", "rejection_reason = NULL");
  await pool.execute(`UPDATE promotions SET ${sets.join(", ")} WHERE id = ?`, [...values, id]);
  return findPromotion(id);
}

export async function deletePromotion(id, { businessAccount, admin }) {
  const promo = await findPromotion(id);
  if (!promo) throw notFound("Promotion not found");
  if (!admin && Number(promo.account_id) !== Number(businessAccount?.id)) throw forbidden("Not your promotion");
  await pool.execute("DELETE FROM promotions WHERE id = ?", [id]);
}

export async function submitPromotion(id, accountId) {
  const promo = await findPromotion(id);
  if (!promo) throw notFound("Promotion not found");
  if (Number(promo.account_id) !== Number(accountId)) throw forbidden("Not your promotion");
  const [result] = await pool.execute("UPDATE promotions SET status = 'pending_approval' WHERE id = ? AND status IN ('draft', 'rejected')", [id]);
  if (!result.affectedRows) throw conflict("This promotion cannot be submitted in its current status");
  return findPromotion(id);
}

export async function listMyPromotions(accountId, status) {
  const business = await businessForAccount(accountId);
  if (!business) throw notFound("Business profile not found");
  const params = [business.id];
  let statusSql = "";
  if (status) { statusSql = " AND p.status = ?"; params.push(status); }
  return query(`${SELECT} WHERE p.business_id = ?${statusSql} ORDER BY p.created_at DESC`, params);
}

export async function adminListPromotions({ status, businessId, page = 1, limit = 20 } = {}) {
  const where = ["1 = 1"];
  const params = [];
  if (status) { where.push("p.status = ?"); params.push(status); }
  if (businessId) { where.push("p.business_id = ?"); params.push(businessId); }
  const whereSql = where.join(" AND ");
  const [[{ total }], data] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM promotions p WHERE ${whereSql}`, params),
    query(`${SELECT} WHERE ${whereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]),
  ]);
  return { data, pagination: { page, limit, total: Number(total) } };
}

async function reviewPromotion(id, adminId, status, reason = null) {
  const [result] = await pool.execute(
    "UPDATE promotions SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ? AND status = 'pending_approval'",
    [status, adminId, reason, id]
  );
  if (!result.affectedRows) {
    if (!(await findPromotion(id))) throw notFound("Promotion not found");
    throw conflict("Only pending promotions can be reviewed");
  }
  return findPromotion(id);
}

export const approvePromotion = (id, adminId) => reviewPromotion(id, adminId, "active");
export const rejectPromotion = (id, adminId, reason) => reviewPromotion(id, adminId, "rejected", reason);

export async function disablePromotion(id, adminId) {
  const [result] = await pool.execute(
    "UPDATE promotions SET status = 'disabled', approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('approved', 'active')",
    [adminId, id]
  );
  if (!result.affectedRows) {
    if (!(await findPromotion(id))) throw notFound("Promotion not found");
    throw conflict("Only approved or active promotions can be disabled");
  }
  return findPromotion(id);
}

export async function removeExpiredPromotions() {
  const [result] = await pool.execute("DELETE FROM promotions WHERE ends_at < NOW() AND status IN ('approved', 'active', 'expired', 'disabled')");
  return result.affectedRows;
}
