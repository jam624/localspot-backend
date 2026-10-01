import * as Business from "./business.model.js";
import { getLocalDayAndMinute, isOpenAt } from "./openingHours.js";

const notFound = (res) => res.status(404).json({ success: false, message: "Listing not found" });
const incomplete = (res, missing) => res.status(422).json({ success: false, message: "Listing is incomplete", missing });
const publicShape = (business, includeHours = false) => {
  const { ownerId, statusReason, hours = [], ...data } = business;
  return { ...data, isOpenNow: isOpenAt(hours, getLocalDayAndMinute()), ...(includeHours ? { hours } : {}) };
};

export async function listBusinesses(req, res, next) {
  try {
    const { items, total } = await Business.searchPublic(req.valid.query);
    const { page, limit } = req.valid.query;
    res.json({ success: true, data: items.map((item) => publicShape(item)), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}

export async function getBySlug(req, res, next) {
  try {
    const business = await Business.findPublicBySlug(req.params.slug);
    if (!business) return res.status(404).json({ success: false, message: "Business not found" });
    Business.incrementViews(business.id).catch((error) => console.error("Failed to record business view:", error.message));
    res.json({ success: true, data: publicShape(business, true) });
  } catch (error) { next(error); }
}

export async function createMine(req, res, next) {
  try {
    const existing = await Business.listByOwner(req.businessAccount.id);
    const draft = existing.find((item) => item.status === "draft");
    const data = draft ? await Business.update(draft.id, req.valid.body) : await Business.create(req.valid.body, { accountId: req.businessAccount.id });
    res.status(draft ? 200 : 201).json({ success: true, data });
  } catch (error) { next(error); }
}

export async function listMine(req, res, next) {
  try { res.json({ success: true, data: await Business.listByOwner(req.businessAccount.id) }); }
  catch (error) { next(error); }
}

export async function getMine(req, res, next) {
  try {
    const item = await Business.findById(req.params.id, { accountId: req.businessAccount.id });
    if (!item) return notFound(res);
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
}

export async function updateMine(req, res, next) {
  try {
    const item = await Business.findById(req.params.id, { accountId: req.businessAccount.id });
    if (!item) return notFound(res);
    if (["submitted", "pending_approval"].includes(item.status)) return res.status(409).json({ success: false, message: "Listing is under review and cannot be edited" });
    if (item.status === "suspended") return res.status(403).json({ success: false, message: "Listing is suspended. Contact support." });
    const updated = await Business.update(item.id, req.valid.body);
    if (item.status === "rejected") await Business.setStatus(item.id, "rejected", "draft");
    res.json({ success: true, data: await Business.findById(updated.id, { accountId: req.businessAccount.id }) });
  } catch (error) { next(error); }
}

export async function submitMine(req, res, next) {
  try {
    const item = await Business.findById(req.params.id, { accountId: req.businessAccount.id });
    if (!item) return notFound(res);
    if (item.status !== "draft") return res.status(409).json({ success: false, message: `A ${item.status} listing cannot be submitted` });
    const missing = Business.missingFields(item);
    if (missing.length) return incomplete(res, missing);
    if (!(await Business.setStatus(item.id, "draft", "submitted"))) return res.status(409).json({ success: false, message: "Listing status changed. Please refresh." });
    res.json({ success: true, data: await Business.findById(item.id) });
  } catch (error) { next(error); }
}

export async function adminList(req, res, next) {
  try {
    const { items, total } = await Business.adminList(req.valid.query);
    const { page, limit } = req.valid.query;
    res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
}

export async function adminGet(req, res, next) {
  try { const item = await Business.findById(req.params.id); if (!item) return notFound(res); res.json({ success: true, data: item }); }
  catch (error) { next(error); }
}

export async function adminCreate(req, res, next) {
  try {
    const { owner, publish, ...data } = req.valid.body;
    if (publish) { const missing = Business.missingFields({ ...data, category: { id: data.category }, location: data.location }); if (missing.length) return incomplete(res, missing); }
    const item = await Business.create(data, { accountId: owner || null, publish: Boolean(publish), adminId: req.admin.id });
    res.status(201).json({ success: true, data: item });
  } catch (error) { next(error); }
}

export async function adminUpdate(req, res, next) {
  try { if (!(await Business.findById(req.params.id))) return notFound(res); res.json({ success: true, data: await Business.update(req.params.id, req.valid.body) }); }
  catch (error) { next(error); }
}

export async function adminSetStatus(req, res, next) {
  try {
    const { status, reason } = req.valid.body;
    const item = await Business.findById(req.params.id);
    if (!item) return notFound(res);
    if (!Business.TRANSITIONS[item.status]?.includes(status)) return res.status(409).json({ success: false, message: `Cannot move a listing from ${item.status} to ${status}`, allowed: Business.TRANSITIONS[item.status] || [] });
    if (status === "published") { const missing = Business.missingFields(item); if (missing.length) return incomplete(res, missing); }
    if (!(await Business.setStatus(item.id, item.status, status, reason, req.admin.id))) return res.status(409).json({ success: false, message: "Listing status changed. Please refresh." });
    res.json({ success: true, data: await Business.findById(item.id) });
  } catch (error) { next(error); }
}

export async function adminSetActive(req, res, next) {
  try {
    const item = await Business.findById(req.params.id);
    if (!item) return notFound(res);
    if (req.valid.body.isActive && item.status === "inactive") {
      const missing = Business.missingFields(item);
      if (missing.length) return incomplete(res, missing);
    } else if (req.valid.body.isActive && !["published", "active"].includes(item.status)) {
      return res.status(409).json({ success: false, message: "Only a published listing can be reactivated" });
    }
    if (!req.valid.body.isActive && !["published", "active", "inactive"].includes(item.status)) {
      return res.status(409).json({ success: false, message: "Only a published listing can be deactivated" });
    }
    await Business.setActive(req.params.id, req.valid.body.isActive);
    res.json({ success: true, data: await Business.findById(req.params.id) });
  } catch (error) { next(error); }
}
