import { query } from "../../config/db.js";
import { notFound } from "../../utils/errors.js";

function toNum(v) { return Number(v ?? 0); }

function sinceDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export async function getAdminDashboard() {
  const since30 = sinceDate(30);

  const [
    [bizTotal], [bizPending], [bizPublished],
    [totalEvents], [adActive], [adPending],
    [featuredActive], [promoActive],
    [revTotal],
  ] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM businesses`),
    query(`SELECT COUNT(*) AS total FROM businesses WHERE listing_status IN ('submitted','pending_approval')`),
    query(`SELECT COUNT(*) AS total FROM businesses WHERE listing_status IN ('published','active')`),
    query(`SELECT COUNT(*) AS total FROM events WHERE created_at >= ?`, [since30]),
    query(`SELECT COUNT(*) AS total FROM advertisements WHERE status = 'active'`),
    query(`SELECT COUNT(*) AS total FROM advertisements WHERE status IN ('submitted','pending_approval')`),
    query(`SELECT COUNT(*) AS total FROM featured_listing_requests WHERE status = 'active'`),
    query(`SELECT COUNT(*) AS total FROM promotions WHERE status = 'active' AND ends_at > NOW()`),
    query(`SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_transactions WHERE status = 'completed'`),
  ]);

  return {
    businesses: {
      total: toNum(bizTotal.total),
      pending: toNum(bizPending.total),
      published: toNum(bizPublished.total),
    },
    traffic: { eventsLast30Days: toNum(totalEvents.total) },
    advertising: {
      activeAds: toNum(adActive.total),
      pendingReview: toNum(adPending.total),
    },
    featuredListings: { active: toNum(featuredActive.total) },
    promotions: { active: toNum(promoActive.total) },
    revenue: { totalCompleted: Number(revTotal.total) },
  };
}

// ─── Admin Revenue ────────────────────────────────────────────────────────────

function fmtTx(t) {
  return {
    id: toNum(t.id),
    businessId: toNum(t.business_id),
    businessName: t.business_name ?? null,
    advertisementId: t.advertisement_id ? toNum(t.advertisement_id) : null,
    featuredListingRequestId: t.featured_listing_request_id ? toNum(t.featured_listing_request_id) : null,
    transactionType: t.transaction_type,
    amount: Number(t.amount),
    currency: t.currency,
    paymentProvider: t.payment_provider,
    providerReference: t.provider_reference,
    status: t.status,
    paidAt: t.paid_at ?? null,
    notes: t.notes ?? null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export async function getRevenueSummary() {
  const [[totalRow], [completedRow], [pendingRow], byType] = await Promise.all([
    query(`SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_transactions`),
    query(`SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_transactions WHERE status = 'completed'`),
    query(`SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_transactions WHERE status = 'pending'`),
    query(`SELECT transaction_type, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count FROM revenue_transactions GROUP BY transaction_type`),
  ]);

  return {
    total: Number(totalRow.total),
    completed: Number(completedRow.total),
    pending: Number(pendingRow.total),
    byType: byType.map((r) => ({ type: r.transaction_type, total: Number(r.total), count: toNum(r.count) })),
  };
}

export async function listRevenueTransactions(queryParams) {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 25));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (queryParams.status) { conditions.push("rt.status = ?"); params.push(queryParams.status); }
  if (queryParams.type) { conditions.push("rt.transaction_type = ?"); params.push(queryParams.type); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [{ total }] = await query(
    `SELECT COUNT(*) AS total FROM revenue_transactions rt ${where}`,
    params
  );

  const rows = await query(
    `SELECT rt.*, b.name AS business_name
     FROM revenue_transactions rt
     LEFT JOIN businesses b ON b.id = rt.business_id
     ${where}
     ORDER BY rt.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    data: rows.map(fmtTx),
    pagination: { page, limit, total: toNum(total), totalPages: Math.ceil(toNum(total) / limit) },
  };
}

export async function getRevenueTransaction(id) {
  const rows = await query(
    `SELECT rt.*, b.name AS business_name
     FROM revenue_transactions rt
     LEFT JOIN businesses b ON b.id = rt.business_id
     WHERE rt.id = ?
     LIMIT 1`,
    [Number(id)]
  );
  if (!rows.length) throw notFound("Transaction not found");
  return fmtTx(rows[0]);
}
