import { query } from "../../config/db.js";
import { notFound, badRequest } from "../../utils/errors.js";

function toNum(v) { return Number(v ?? 0); }

function fmt(r) {
  return {
    id: toNum(r.id),
    name: r.name,
    slug: r.slug,
    description: r.description ?? null,
    icon: r.icon ?? null,
    sortOrder: toNum(r.sort_order),
    isActive: Boolean(r.is_active),
    businessCount: r.business_count !== undefined ? toNum(r.business_count) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Public ──────────────────────────────────────────────────────────────────

export async function listActiveCategories() {
  const rows = await query(
    `SELECT c.*, COUNT(b.id) AS business_count
     FROM categories c
     LEFT JOIN businesses b ON b.category_id = c.id AND b.listing_status IN ('published','active')
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return { data: rows.map(fmt) };
}

export async function getCategoryByIdOrSlug(idOrSlug) {
  const isId = /^\d+$/.test(idOrSlug);
  const col = isId ? "c.id" : "c.slug";
  const rows = await query(
    `SELECT c.*, COUNT(b.id) AS business_count
     FROM categories c
     LEFT JOIN businesses b ON b.category_id = c.id AND b.listing_status IN ('published','active')
     WHERE ${col} = ? AND c.is_active = 1
     GROUP BY c.id
     LIMIT 1`,
    [isId ? Number(idOrSlug) : idOrSlug]
  );
  if (!rows.length) throw notFound("Category not found");
  return fmt(rows[0]);
}

export async function getBusinessesByCategory(idOrSlug, queryParams) {
  const category = await getCategoryByIdOrSlug(idOrSlug);

  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit) || 20));
  const offset = (page - 1) * limit;

  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM businesses
     WHERE category_id = ? AND listing_status IN ('published','active')`,
    [category.id]
  );

  const rows = await query(
    `SELECT id, name, slug, description, city, area, average_rating, review_count,
            price_range, is_featured, phone, whatsapp, website
     FROM businesses
     WHERE category_id = ? AND listing_status IN ('published','active')
     ORDER BY is_featured DESC, average_rating DESC, review_count DESC
     LIMIT ? OFFSET ?`,
    [category.id, limit, offset]
  );

  return {
    category,
    data: rows,
    pagination: { page, limit, total: toNum(total), totalPages: Math.ceil(toNum(total) / limit) },
  };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminListCategories(queryParams) {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 50));
  const offset = (page - 1) * limit;

  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM categories`);
  const rows = await query(
    `SELECT c.*, COUNT(b.id) AS business_count
     FROM categories c
     LEFT JOIN businesses b ON b.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return {
    data: rows.map(fmt),
    pagination: { page, limit, total: toNum(total), totalPages: Math.ceil(toNum(total) / limit) },
  };
}

export async function adminCreateCategory(body) {
  const { name, description = null, icon = null, sort_order = 0 } = body;
  if (!name || typeof name !== "string" || !name.trim()) throw badRequest("name is required");

  const slug = slugify(name.trim());
  const existing = await query(`SELECT id FROM categories WHERE slug = ? LIMIT 1`, [slug]);
  if (existing.length) throw badRequest("A category with this name/slug already exists");

  const result = await query(
    `INSERT INTO categories (name, slug, description, icon, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [name.trim(), slug, description, icon, sort_order]
  );

  const [row] = await query(`SELECT * FROM categories WHERE id = ? LIMIT 1`, [result.insertId]);
  return { message: "Category created", category: fmt(row) };
}

export async function adminGetCategory(id) {
  const rows = await query(
    `SELECT c.*, COUNT(b.id) AS business_count
     FROM categories c
     LEFT JOIN businesses b ON b.category_id = c.id
     WHERE c.id = ?
     GROUP BY c.id
     LIMIT 1`,
    [Number(id)]
  );
  if (!rows.length) throw notFound("Category not found");
  return fmt(rows[0]);
}

export async function adminUpdateCategory(id, body) {
  const category = await adminGetCategory(id);
  const { name, description, icon, sort_order } = body;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) throw badRequest("name must be a non-empty string");
    updates.push("name = ?", "slug = ?");
    params.push(name.trim(), slugify(name.trim()));
  }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (icon !== undefined) { updates.push("icon = ?"); params.push(icon); }
  if (sort_order !== undefined) { updates.push("sort_order = ?"); params.push(Number(sort_order)); }

  if (!updates.length) throw badRequest("No fields to update");

  params.push(category.id);
  await query(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`, params);
  const [row] = await query(`SELECT * FROM categories WHERE id = ? LIMIT 1`, [category.id]);
  return { message: "Category updated", category: fmt(row) };
}

export async function adminDeleteCategory(id) {
  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM businesses WHERE category_id = ?`,
    [Number(id)]
  );
  if (toNum(total) > 0) throw badRequest("Cannot delete a category that has businesses assigned to it");

  const result = await query(`DELETE FROM categories WHERE id = ?`, [Number(id)]);
  if (!result.affectedRows) throw notFound("Category not found");
  return { message: "Category deleted" };
}

export async function adminSetCategoryActive(id, isActive) {
  const result = await query(
    `UPDATE categories SET is_active = ? WHERE id = ?`,
    [isActive ? 1 : 0, Number(id)]
  );
  if (!result.affectedRows) throw notFound("Category not found");
  return { message: isActive ? "Category enabled" : "Category disabled" };
}
