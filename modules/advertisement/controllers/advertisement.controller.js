import { query } from "../../../config/db.js";
import {
  advertisementStatements as S,
  advertisementTypeStatements as T,
  advertisementSlotStatements as L,
} from "../../../sql/advertisementStatement.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok         = (res, data)           => res.json({ success: true, data });
const created    = (res, data)           => res.status(201).json({ success: true, data });
const bad        = (res, message)        => res.status(400).json({ success: false, message });
const notFound   = (res, message = "Not found") => res.status(404).json({ success: false, message });
const forbidden  = (res, message = "Forbidden") => res.status(403).json({ success: false, message });
const conflict   = (res, message)        => res.status(409).json({ success: false, message });
const serverErr  = (res, err) => {
  console.error("[advertisementController]", err);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const toDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const asInt = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

/**
 * Compute the status an approved ad should land in based on its schedule.
 *  - future start date  -> 'scheduled'
 *  - currently running   -> 'active'
 *  - otherwise           -> 'approved'
 */
function computeApprovedStatus(startsAt, endsAt) {
  const now = new Date();
  const start = toDate(startsAt);
  const end = toDate(endsAt);

  if (start && start > now) return "scheduled";
  if (start && start <= now && (!end || end > now)) return "active";
  if (!start && (!end || end > now)) return "active";
  return "approved";
}

// Statuses a business may transition their own ad into
const BUSINESS_EDITABLE_STATUSES = new Set(["draft", "rejected"]);
const BUSINESS_PAUSABLE_STATUSES = new Set(["active", "scheduled", "approved"]);
const BUSINESS_RESUMABLE_STATUSES = new Set(["paused"]);

// Statuses an admin may set directly
const ADMIN_SETTABLE_STATUSES = new Set([
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "active",
  "paused",
  "expired",
  "disabled",
]);

// ---------------------------------------------------------------------------
// Public — types & slots
// ---------------------------------------------------------------------------

/**
 * GET /api/advertisements/types
 */
export async function listAdvertisementTypes(_req, res) {
  try {
    const rows = await query(T.listActive);
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/advertisements/slots
 */
export async function listAdvertisementSlots(_req, res) {
  try {
    const rows = await query(L.listActive);
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err);
  }
}

// ---------------------------------------------------------------------------
// BUSINESS side
// ---------------------------------------------------------------------------
// Assumes an auth middleware that attaches:
//   req.business = { id: <business_account_id> }
// ---------------------------------------------------------------------------

async function resolveBusinessForAccount(accountId) {
  const rows = await query(S.findBusinessByAccountId, [accountId]);
  return rows[0] || null;
}

/**
 * POST /api/business/advertisements
 * body: { slot_id, title, body?, image_url?, destination_url?,
 *         target_category_id?, target_location?,
 *         starts_at?, ends_at?, budget? }
 */
export async function createAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const {
      slot_id,
      title,
      body = null,
      image_url = null,
      destination_url = null,
      target_category_id = null,
      target_location = null,
      starts_at = null,
      ends_at = null,
      budget = null,
    } = req.body || {};

    if (!slot_id) return bad(res, "slot_id is required");
    if (!title || String(title).trim().length < 3) {
      return bad(res, "title is required (min 3 characters)");
    }

    const slotRows = await query(L.findById, [slot_id]);
    const slot = slotRows[0];
    if (!slot || !slot.is_active) return bad(res, "Invalid or inactive slot_id");

    const start = toDate(starts_at);
    const end = toDate(ends_at);
    if (starts_at && !start) return bad(res, "Invalid starts_at");
    if (ends_at && !end) return bad(res, "Invalid ends_at");
    if (start && end && end <= start) return bad(res, "ends_at must be after starts_at");

    const result = await query(S.create, [
      business.id,
      slot_id,
      target_category_id,
      target_location,
      String(title).trim(),
      body,
      image_url,
      destination_url,
      start,
      end,
      budget,
    ]);

    const adRows = await query(S.findById, [result.insertId]);
    return created(res, adRows[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/business/advertisements
 */
export async function listMyAdvertisements(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.listByBusiness, [business.id]);
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/business/advertisements/:id
 */
export async function getMyAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);
    if (ad.business_id !== business.id) return notFound(res);

    return ok(res, ad);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * PUT /api/business/advertisements/:id
 * Only editable while status is 'draft' or 'rejected'.
 */
export async function updateMyAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad || ad.business_id !== business.id) return notFound(res);

    if (!BUSINESS_EDITABLE_STATUSES.has(ad.status)) {
      return conflict(res, `Cannot edit an advertisement in status '${ad.status}'`);
    }

    const {
      slot_id = ad.slot_id,
      title = ad.title,
      body = ad.body,
      image_url = ad.image_url,
      destination_url = ad.destination_url,
      target_category_id = ad.target_category_id,
      target_location = ad.target_location,
      starts_at = ad.starts_at,
      ends_at = ad.ends_at,
      budget = ad.budget,
    } = req.body || {};

    if (!slot_id) return bad(res, "slot_id is required");
    if (!title || String(title).trim().length < 3) {
      return bad(res, "title is required (min 3 characters)");
    }

    const slotRows = await query(L.findById, [slot_id]);
    const slot = slotRows[0];
    if (!slot || !slot.is_active) return bad(res, "Invalid or inactive slot_id");

    const start = toDate(starts_at);
    const end = toDate(ends_at);
    if (starts_at && !start) return bad(res, "Invalid starts_at");
    if (ends_at && !end) return bad(res, "Invalid ends_at");
    if (start && end && end <= start) return bad(res, "ends_at must be after starts_at");

    await query(S.update, [
      slot_id,
      target_category_id,
      target_location,
      String(title).trim(),
      body,
      image_url,
      destination_url,
      start,
      end,
      budget,
      id,
    ]);

    const updated = await query(S.findById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/business/advertisements/:id/submit
 * draft | rejected  ->  pending_approval
 */
export async function submitMyAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad || ad.business_id !== business.id) return notFound(res);

    if (!BUSINESS_EDITABLE_STATUSES.has(ad.status)) {
      return conflict(res, `Cannot submit an advertisement in status '${ad.status}'`);
    }

    if (ad.ends_at && new Date(ad.ends_at) <= new Date()) {
      return bad(res, "This advertisement has already expired");
    }

    await query(S.updateStatus, ["pending_approval", id]);
    const updated = await query(S.findById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/business/advertisements/:id/pause
 */
export async function pauseMyAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad || ad.business_id !== business.id) return notFound(res);

    if (!BUSINESS_PAUSABLE_STATUSES.has(ad.status)) {
      return conflict(res, `Cannot pause an advertisement in status '${ad.status}'`);
    }

    await query(S.updateStatus, ["paused", id]);
    const updated = await query(S.findById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/business/advertisements/:id/resume
 */
export async function resumeMyAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad || ad.business_id !== business.id) return notFound(res);

    if (!BUSINESS_RESUMABLE_STATUSES.has(ad.status)) {
      return conflict(res, `Cannot resume an advertisement in status '${ad.status}'`);
    }

    // If the ad was scheduled and hasn't started yet, keep it scheduled.
    const nextStatus = computeApprovedStatus(ad.starts_at, ad.ends_at) === "scheduled"
      ? "scheduled"
      : "active";

    await query(S.updateStatus, [nextStatus, id]);
    const updated = await query(S.findById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * DELETE /api/business/advertisements/:id
 * Only draft/rejected ads can be deleted by the business.
 */
export async function deleteMyAdvertisement(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad || ad.business_id !== business.id) return notFound(res);

    if (!BUSINESS_EDITABLE_STATUSES.has(ad.status)) {
      return conflict(res, `Cannot delete an advertisement in status '${ad.status}'`);
    }

    await query(S.delete, [id]);
    return ok(res, { id, deleted: true });
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/business/advertisements/:id/performance?from=&to=
 */
export async function getMyAdvertisementPerformance(req, res) {
  try {
    const accountId = req.businessAccount?.id ?? req.user?.id;
    if (!accountId) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const business = await resolveBusinessForAccount(accountId);
    if (!business) return notFound(res, "Business profile not found for this account");

    const rows = await query(S.findById, [id]);
    const ad = rows[0];
    if (!ad || ad.business_id !== business.id) return notFound(res);

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const from = toDate(req.query.from) || defaultFrom;
    const to = toDate(req.query.to) || now;

    const perfRows = await query(S.performance, [id, from, to]);
    const perf = perfRows[0] || { impressions: 0, clicks: 0 };

    const impressions = Number(perf.impressions) || 0;
    const clicks = Number(perf.clicks) || 0;

    return ok(res, {
      advertisement_id: id,
      from,
      to,
      impressions,
      clicks,
      ctr: impressions > 0 ? Number((clicks / impressions).toFixed(4)) : 0,
    });
  } catch (err) {
    return serverErr(res, err);
  }
}

// ---------------------------------------------------------------------------
// ADMIN side
// ---------------------------------------------------------------------------
// Assumes an auth middleware that attaches:
//   req.admin = { id: <admin_id>, role: 'admin' | 'super_admin' | 'moderator' }
// ---------------------------------------------------------------------------

function buildAdminListQuery(filters) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push("a.status = ?");
    params.push(filters.status);
  }
  if (filters.business_id) {
    conditions.push("a.business_id = ?");
    params.push(filters.business_id);
  }
  if (filters.slot_id) {
    conditions.push("a.slot_id = ?");
    params.push(filters.slot_id);
  }
  if (filters.type_id) {
    conditions.push("s.type_id = ?");
    params.push(filters.type_id);
  }
  if (filters.search) {
    conditions.push("(a.title LIKE ? OR b.name LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.from) {
    conditions.push("a.created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("a.created_at <= ?");
    params.push(filters.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const listSql = `
    SELECT a.id, a.business_id, a.slot_id, a.target_category_id, a.target_location,
           a.title, a.status, a.starts_at, a.ends_at, a.budget,
           a.rejection_reason, a.approved_at, a.created_at, a.updated_at,
           b.name AS business_name, b.slug AS business_slug,
           s.code AS slot_code, s.name AS slot_name, s.placement AS slot_placement,
           t.code AS type_code, t.name AS type_name
    FROM advertisements a
    JOIN businesses b ON b.id = a.business_id
    JOIN advertisement_slots s ON s.id = a.slot_id
    JOIN advertisement_types t ON t.id = s.type_id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ${filters.limit} OFFSET ${filters.offset}
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM advertisements a
    JOIN businesses b ON b.id = a.business_id
    JOIN advertisement_slots s ON s.id = a.slot_id
    JOIN advertisement_types t ON t.id = s.type_id
    ${where}
  `;

  return { listSql, countSql, params };
}

/**
 * GET /api/admin/advertisements
 * query: status, business_id, slot_id, type_id, search, from, to, limit, offset
 */
export async function adminListAdvertisements(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const limit = Math.min(Math.max(asInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(asInt(req.query.offset) || 0, 0);

    const filters = {
      status: req.query.status || null,
      business_id: asInt(req.query.business_id),
      slot_id: asInt(req.query.slot_id),
      type_id: asInt(req.query.type_id),
      search: req.query.search ? String(req.query.search).trim() : null,
      from: toDate(req.query.from),
      to: toDate(req.query.to),
      limit,
      offset,
    };

    const { listSql, countSql, params } = buildAdminListQuery(filters);

    const [rows, countRows] = await Promise.all([
      query(listSql, params),
      query(countSql, params),
    ]);

    const total = Number(countRows[0]?.total) || 0;

    return ok(res, {
      items: rows,
      pagination: { total, limit, offset, page: Math.floor(offset / limit) + 1 },
    });
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/admin/advertisements/:id
 */
export async function adminGetAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    return ok(res, ad);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/admin/advertisements/:id/approve
 * Enforces slot capacity (max_active_campaigns).
 */
export async function adminApproveAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    if (!["pending_approval", "submitted", "rejected", "approved", "scheduled"].includes(ad.status)) {
      return conflict(res, `Cannot approve an advertisement in status '${ad.status}'`);
    }

    // Slot capacity check
    const capacityRows = await query(L.countActiveBySlot, [ad.slot_id]);
    const activeCount = Number(capacityRows[0]?.count) || 0;
    const maxActive = Number(ad.max_active_campaigns) || 1;

    // If the ad is already in an "occupying" status, it's counted in activeCount.
    const alreadyCounted = ["approved", "scheduled", "active"].includes(ad.status);
    if (!alreadyCounted && activeCount >= maxActive) {
      return conflict(res, `Slot '${ad.slot_code}' is at capacity (${activeCount}/${maxActive})`);
    }

    const nextStatus = computeApprovedStatus(ad.starts_at, ad.ends_at);

    await query(S.adminApprove, [nextStatus, req.admin.id, id]);
    const updated = await query(S.adminFindById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/admin/advertisements/:id/reject
 * body: { reason }
 */
export async function adminRejectAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const reason = (req.body?.reason || "").trim();
    if (reason.length < 3) return bad(res, "A rejection reason is required");

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    if (["expired", "disabled"].includes(ad.status)) {
      return conflict(res, `Cannot reject an advertisement in status '${ad.status}'`);
    }

    await query(S.adminReject, [reason, req.admin.id, id]);
    const updated = await query(S.adminFindById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * PATCH /api/admin/advertisements/:id/status
 * body: { status }
 * Allowed: draft, pending_approval, approved, scheduled, active, paused, expired, disabled
 * Note: for 'approved' path, use the approve endpoint so capacity is enforced.
 */
export async function adminSetAdvertisementStatus(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const status = (req.body?.status || "").trim();
    if (!ADMIN_SETTABLE_STATUSES.has(status)) {
      return bad(res, `Invalid status. Allowed: ${[...ADMIN_SETTABLE_STATUSES].join(", ")}`);
    }

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    // Enforce capacity when moving into an occupying status from outside it
    if (["approved", "scheduled", "active"].includes(status) &&
        !["approved", "scheduled", "active"].includes(ad.status)) {
      const capacityRows = await query(L.countActiveBySlot, [ad.slot_id]);
      const activeCount = Number(capacityRows[0]?.count) || 0;
      const maxActive = Number(ad.max_active_campaigns) || 1;
      if (activeCount >= maxActive) {
        return conflict(res, `Slot '${ad.slot_code}' is at capacity (${activeCount}/${maxActive})`);
      }
    }

    await query(S.adminSetStatus, [status, id]);
    const updated = await query(S.adminFindById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/v1/admin/advertisements/:id/activate
 * Spec-aligned lifecycle action (README §20).
 */
export async function adminActivateAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    if (!["approved", "scheduled", "paused"].includes(ad.status)) {
      return conflict(res, `Cannot activate an advertisement in status '${ad.status}'`);
    }

    if (!["approved", "scheduled", "active"].includes(ad.status)) {
      const capacityRows = await query(L.countActiveBySlot, [ad.slot_id]);
      const activeCount = Number(capacityRows[0]?.count) || 0;
      const maxActive = Number(ad.max_active_campaigns) || 1;
      if (activeCount >= maxActive) {
        return conflict(res, `Slot '${ad.slot_code}' is at capacity (${activeCount}/${maxActive})`);
      }
    }

    await query(S.adminSetStatus, ["active", id]);
    const updated = await query(S.adminFindById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/v1/admin/advertisements/:id/pause
 * Spec-aligned lifecycle action (README §20).
 */
export async function adminPauseAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    if (!["active", "scheduled", "approved"].includes(ad.status)) {
      return conflict(res, `Cannot pause an advertisement in status '${ad.status}'`);
    }

    await query(S.adminSetStatus, ["paused", id]);
    const updated = await query(S.adminFindById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/v1/admin/advertisements/:id/disable
 * Spec-aligned lifecycle action (README §20).
 */
export async function adminDisableAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const rows = await query(S.adminFindById, [id]);
    const ad = rows[0];
    if (!ad) return notFound(res);

    if (["expired", "disabled"].includes(ad.status)) {
      return conflict(res, `Cannot disable an advertisement in status '${ad.status}'`);
    }

    await query(S.adminSetStatus, ["disabled", id]);
    const updated = await query(S.adminFindById, [id]);
    return ok(res, updated[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * DELETE /api/admin/advertisements/:id
 */
export async function adminDeleteAdvertisement(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid advertisement id");

    const rows = await query(S.adminFindById, [id]);
    if (!rows[0]) return notFound(res);

    await query(S.adminDelete, [id]);
    return ok(res, { id, deleted: true });
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/admin/advertisements/stats?from=
 */
export async function adminAdvertisementStats(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const from = toDate(req.query.from) || new Date(0);

    const [summaryRows, byStatusRows, activeRows] = await Promise.all([
      query(S.adminStatsSummary, [from]),
      query(S.adminCountByStatus),
      query(S.adminActiveCampaigns),
    ]);

    const summary = summaryRows[0] || {};
    // Coerce numeric strings
    Object.keys(summary).forEach((k) => { summary[k] = Number(summary[k]) || 0; });

    return ok(res, {
      summary,
      by_status: byStatusRows,
      active_campaigns: Number(activeRows[0]?.count) || 0,
    });
  } catch (err) {
    return serverErr(res, err);
  }
}

// ---------------------------------------------------------------------------
// ADMIN — types & slots management
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/advertisement-types
 */
export async function adminListAdvertisementTypes(_req, res) {
  try {
    const rows = await query(T.listAll);
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/admin/advertisement-types
 * body: { code, name, description?, base_price?, is_active? }
 */
export async function adminCreateAdvertisementType(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const { code, name, description = null, base_price = null, is_active = 1 } = req.body || {};
    if (!code || !name) return bad(res, "code and name are required");

    const existing = await query(T.findByCode, [code]);
    if (existing[0]) return conflict(res, "An advertisement type with this code already exists");

    const result = await query(T.create, [code, name, description, base_price, is_active ? 1 : 0]);
    const rows = await query(T.findById, [result.insertId]);
    return created(res, rows[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * PUT /api/admin/advertisement-types/:id
 */
export async function adminUpdateAdvertisementType(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid type id");

    const existing = await query(T.findById, [id]);
    if (!existing[0]) return notFound(res);

    const {
      name = existing[0].name,
      description = existing[0].description,
      base_price = existing[0].base_price,
      is_active = existing[0].is_active,
    } = req.body || {};

    await query(T.update, [name, description, base_price, is_active ? 1 : 0, id]);
    const rows = await query(T.findById, [id]);
    return ok(res, rows[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * GET /api/admin/advertisement-slots
 */
export async function adminListAdvertisementSlots(_req, res) {
  try {
    const rows = await query(L.listAll);
    return ok(res, rows);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * POST /api/admin/advertisement-slots
 * body: { type_id, code, name, placement, max_active_campaigns?, is_active? }
 */
export async function adminCreateAdvertisementSlot(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const {
      type_id,
      code,
      name,
      placement,
      max_active_campaigns = 1,
      is_active = 1,
    } = req.body || {};

    if (!type_id || !code || !name || !placement) {
      return bad(res, "type_id, code, name and placement are required");
    }

    const type = await query(T.findById, [type_id]);
    if (!type[0]) return bad(res, "Invalid type_id");

    const existing = await query(L.findByCode, [code]);
    if (existing[0]) return conflict(res, "An advertisement slot with this code already exists");

    const result = await query(L.create, [
      type_id, code, name, placement, max_active_campaigns, is_active ? 1 : 0,
    ]);
    const rows = await query(L.findById, [result.insertId]);
    return created(res, rows[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}

/**
 * PUT /api/admin/advertisement-slots/:id
 */
export async function adminUpdateAdvertisementSlot(req, res) {
  try {
    if (!req.admin) return forbidden(res);

    const id = asInt(req.params.id);
    if (!id) return bad(res, "Invalid slot id");

    const existing = await query(L.findById, [id]);
    if (!existing[0]) return notFound(res);

    const {
      name = existing[0].name,
      placement = existing[0].placement,
      max_active_campaigns = existing[0].max_active_campaigns,
      is_active = existing[0].is_active,
    } = req.body || {};

    await query(L.update, [name, placement, max_active_campaigns, is_active ? 1 : 0, id]);
    const rows = await query(L.findById, [id]);
    return ok(res, rows[0]);
  } catch (err) {
    return serverErr(res, err);
  }
}
