import { query } from "../../../config/db.js";
import { featuredListingStatements } from "../../../config/statement.js";
import { badRequest, notFound } from "../../../utils/errors.js";

// convert BigInt / null to a plain JS number
function toNum(val) {
  return Number(val ?? 0);
}

// format a DB row into the business-facing response shape
function formatRequest(r) {
  return {
    id: toNum(r.id),
    placement: r.placement,
    requestedStartDate: r.requested_start_date ?? null,
    requestedEndDate: r.requested_end_date ?? null,
    status: r.status,
    rejectionReason: r.rejection_reason ?? null,
    approvedAt: r.approved_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    category: r.category_id
      ? { id: toNum(r.category_id), name: r.category_name, slug: r.category_slug }
      : null,
  };
}

// format a DB row into the admin-facing response shape (includes business info)
function formatAdminRequest(r) {
  return {
    ...formatRequest(r),
    business: {
      id: toNum(r.business_id),
      name: r.business_name,
      slug: r.business_slug,
    },
  };
}

// format current datetime as MariaDB DATETIME string
function nowMySQL() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// fetch business by account — 404 if not found
async function requireBusiness(accountId) {
  const rows = await query(featuredListingStatements.findBusinessByAccountId, [accountId]);
  if (!rows.length) throw notFound("No business listing found for this account");
  return rows[0];
}

// ─── Business ────────────────────────────────────────────────────────────────

// submit a new featured listing request
export async function createFeaturedListingRequest(accountId, body) {
  const business = await requireBusiness(accountId);

  const {
    placement = "homepage_featured",
    category_id = null,
    requested_start_date = null,
    requested_end_date = null,
  } = body;

  // block duplicate pending/active requests for the same placement
  const duplicates = await query(
    featuredListingStatements.findActivePendingByBusinessAndPlacement,
    [business.id, placement]
  );
  if (duplicates.length) {
    throw badRequest(
      "You already have a pending or active featured listing request for this placement"
    );
  }

  const result = await query(featuredListingStatements.create, [
    business.id,
    category_id ?? null,
    placement,
    requested_start_date ?? null,
    requested_end_date ?? null,
  ]);

  const [created] = await query(featuredListingStatements.findByIdAndBusinessId, [
    result.insertId,
    business.id,
  ]);

  return { message: "Featured listing request submitted", request: formatRequest(created) };
}

// list all featured listing requests for this business
export async function getMyFeaturedListingRequests(accountId, queryParams) {
  const business = await requireBusiness(accountId);

  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(queryParams.limit) || 20));
  const offset = (page - 1) * limit;

  const [countRow] = await query(featuredListingStatements.countByBusinessId, [business.id]);
  const total = toNum(countRow.total);

  const rows = await query(featuredListingStatements.findByBusinessId, [
    business.id,
    limit,
    offset,
  ]);

  return {
    data: rows.map(formatRequest),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// get a single featured listing request (scoped to the authenticated business)
export async function getMyFeaturedListingRequestById(accountId, id) {
  const business = await requireBusiness(accountId);

  const rows = await query(featuredListingStatements.findByIdAndBusinessId, [id, business.id]);
  if (!rows.length) throw notFound("Featured listing request not found");

  return formatRequest(rows[0]);
}

// ─── Admin ───────────────────────────────────────────────────────────────────

// list all requests, optionally filtered by status
export async function adminListFeaturedListings(queryParams) {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 20));
  const offset = (page - 1) * limit;
  const { status } = queryParams;

  let countRow, rows;

  if (status) {
    [countRow] = await query(featuredListingStatements.adminCountByStatus, [status]);
    rows = await query(featuredListingStatements.adminListByStatus, [status, limit, offset]);
  } else {
    [countRow] = await query(featuredListingStatements.adminCountAll, []);
    rows = await query(featuredListingStatements.adminListAll, [limit, offset]);
  }

  const total = toNum(countRow.total);

  return {
    data: rows.map(formatAdminRequest),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// get a single featured listing request by ID
export async function adminGetFeaturedListingById(id) {
  const rows = await query(featuredListingStatements.adminFindById, [id]);
  if (!rows.length) throw notFound("Featured listing request not found");
  return formatAdminRequest(rows[0]);
}

// approve: requested | pending_approval → approved
export async function adminApproveFeaturedListing(id, adminId) {
  const rows = await query(featuredListingStatements.adminFindById, [id]);
  if (!rows.length) throw notFound("Featured listing request not found");

  const { status } = rows[0];
  if (!["requested", "pending_approval"].includes(status)) {
    throw badRequest(`Cannot approve a request with status '${status}'`);
  }

  await query(featuredListingStatements.updateStatus, [
    "approved",
    null,           // rejection_reason cleared
    adminId,
    nowMySQL(),
    id,
  ]);

  const [updated] = await query(featuredListingStatements.adminFindById, [id]);
  return { message: "Featured listing request approved", request: formatAdminRequest(updated) };
}

// reject: requested | pending_approval | approved → rejected
export async function adminRejectFeaturedListing(id, adminId, rejectionReason) {
  const rows = await query(featuredListingStatements.adminFindById, [id]);
  if (!rows.length) throw notFound("Featured listing request not found");

  const { status } = rows[0];
  if (!["requested", "pending_approval", "approved"].includes(status)) {
    throw badRequest(`Cannot reject a request with status '${status}'`);
  }

  await query(featuredListingStatements.updateStatus, [
    "rejected",
    rejectionReason.trim(),
    adminId,
    nowMySQL(),
    id,
  ]);

  const [updated] = await query(featuredListingStatements.adminFindById, [id]);
  return { message: "Featured listing request rejected", request: formatAdminRequest(updated) };
}

// activate: approved → active, sets is_featured = true
export async function adminActivateFeaturedListing(id, adminId) {
  const rows = await query(featuredListingStatements.adminFindById, [id]);
  if (!rows.length) throw notFound("Featured listing request not found");

  const { status, business_id } = rows[0];
  if (status !== "approved") {
    throw badRequest(
      `Cannot activate a request with status '${status}'. It must be approved first.`
    );
  }

  await query(featuredListingStatements.updateStatus, [
    "active",
    null,
    adminId,
    nowMySQL(),
    id,
  ]);

  // sync is_featured on businesses table
  await query(featuredListingStatements.setBusinessFeatured, [true, business_id]);

  const [updated] = await query(featuredListingStatements.adminFindById, [id]);
  return { message: "Featured listing activated", request: formatAdminRequest(updated) };
}

// disable: active | approved → disabled, unsets is_featured if no other active listings remain
export async function adminDisableFeaturedListing(id, adminId) {
  const rows = await query(featuredListingStatements.adminFindById, [id]);
  if (!rows.length) throw notFound("Featured listing request not found");

  const { status, business_id } = rows[0];
  if (!["active", "approved"].includes(status)) {
    throw badRequest(`Cannot disable a request with status '${status}'`);
  }

  await query(featuredListingStatements.updateStatus, [
    "disabled",
    null,
    adminId,
    nowMySQL(),
    id,
  ]);

  // unset is_featured only if no other active requests remain
  const [activeRow] = await query(featuredListingStatements.countActiveByBusiness, [business_id]);
  if (toNum(activeRow.active_count) === 0) {
    await query(featuredListingStatements.setBusinessFeatured, [false, business_id]);
  }

  const [updated] = await query(featuredListingStatements.adminFindById, [id]);
  return { message: "Featured listing disabled", request: formatAdminRequest(updated) };
}
