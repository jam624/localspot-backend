import {
  listActiveCategories,
  getCategoryByIdOrSlug,
  getBusinessesByCategory,
  adminListCategories,
  adminCreateCategory,
  adminGetCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminSetCategoryActive,
} from "./categories.service.js";

// ─── Public ───────────────────────────────────────────────────────────────────

export async function listCategories(req, res, next) {
  try {
    return res.status(200).json(await listActiveCategories());
  } catch (e) { return next(e); }
}

export async function getCategory(req, res, next) {
  try {
    return res.status(200).json(await getCategoryByIdOrSlug(req.params.idOrSlug));
  } catch (e) { return next(e); }
}

export async function listCategoryBusinesses(req, res, next) {
  try {
    return res.status(200).json(await getBusinessesByCategory(req.params.idOrSlug, req.query));
  } catch (e) { return next(e); }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function adminList(req, res, next) {
  try {
    return res.status(200).json(await adminListCategories(req.query));
  } catch (e) { return next(e); }
}

export async function adminCreate(req, res, next) {
  try {
    return res.status(201).json(await adminCreateCategory(req.body));
  } catch (e) { return next(e); }
}

export async function adminGet(req, res, next) {
  try {
    return res.status(200).json(await adminGetCategory(req.params.id));
  } catch (e) { return next(e); }
}

export async function adminUpdate(req, res, next) {
  try {
    return res.status(200).json(await adminUpdateCategory(req.params.id, req.body));
  } catch (e) { return next(e); }
}

export async function adminDelete(req, res, next) {
  try {
    return res.status(200).json(await adminDeleteCategory(req.params.id));
  } catch (e) { return next(e); }
}

export async function adminEnable(req, res, next) {
  try {
    return res.status(200).json(await adminSetCategoryActive(req.params.id, true));
  } catch (e) { return next(e); }
}

export async function adminDisable(req, res, next) {
  try {
    return res.status(200).json(await adminSetCategoryActive(req.params.id, false));
  } catch (e) { return next(e); }
}
