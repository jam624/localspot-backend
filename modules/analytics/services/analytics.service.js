import { query } from "../../../config/db.js";
import { analyticsStatements } from "../../../config/statement.js";
import { notFound } from "../../../utils/errors.js";

// helper: resolves the date window from query params — defaults to last 30 days
function resolveDateRange(queryParams) {
  const now = new Date();

  // custom range wins over period
  if (queryParams.startDate && queryParams.endDate) {
    const start = new Date(queryParams.startDate);
    const end = new Date(queryParams.endDate);
    // include the full end day up to 23:59:59
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const period = queryParams.period || "30d";

  let start;
  switch (period) {
    case "today": {
      // midnight of today
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    }
    case "7d": {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    }
    case "30d":
    default: {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    }
  }

  return { start, end: now };
}

// helper: formats a JS Date to MySQL DATETIME string (YYYY-MM-DD HH:MM:SS)
function toMySQLDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// helper: safely converts BigInt COUNT(*) results to a plain JS number
function toNum(value) {
  return Number(value ?? 0);
}

// helper: calculates click-through rate as a percentage, rounded to 2dp
function calcCtr(clicks, impressions) {
  if (!impressions) return 0;
  return Number(((toNum(clicks) / toNum(impressions)) * 100).toFixed(2));
}

// ─── Business analytics ──────────────────────────────────────────────────────

// analytics: business dashboard — profile, action, and ad metrics for the authenticated business
export async function getBusinessAnalytics(accountId, queryParams) {
  // look up the business listing that belongs to this account
  const businesses = await query(analyticsStatements.findBusinessByAccountId, [
    accountId,
  ]);

  if (!businesses.length) {
    throw notFound("No business listing found for this account");
  }

  const business = businesses[0];
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  // one query gets all event counts for this business in the date window
  const [summary] = await query(analyticsStatements.businessEventSummary, [
    business.id,
    startStr,
    endStr,
  ]);

  const impressions = toNum(summary.ad_impressions);
  const clicks = toNum(summary.ad_clicks);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    profile: {
      views: toNum(summary.profile_views),
      searchAppearances: toNum(summary.search_appearances),
      favorites: toNum(summary.favorites),
    },
    actions: {
      phoneClicks: toNum(summary.phone_clicks),
      whatsappClicks: toNum(summary.whatsapp_clicks),
      websiteClicks: toNum(summary.website_clicks),
      directionClicks: toNum(summary.direction_clicks),
    },
    advertising: {
      impressions,
      clicks,
      ctr: calcCtr(clicks, impressions),
    },
  };
}

// ─── Admin analytics ─────────────────────────────────────────────────────────

// analytics: admin overview — high-level platform snapshot (traffic, businesses, ads)
export async function getAdminAnalyticsOverview(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const [traffic] = await query(analyticsStatements.adminTrafficSummary, [startStr, endStr]);
  const [businessStats] = await query(analyticsStatements.adminBusinessStats, [startStr]);
  const [adStats] = await query(analyticsStatements.adminAdvertisingSummary, [startStr, endStr]);
  const [activeCampaigns] = await query(analyticsStatements.adminActiveCampaigns);

  const impressions = toNum(adStats.total_impressions);
  const adClicks = toNum(adStats.total_clicks);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    traffic: {
      profileViews: toNum(traffic.profile_views),
      totalSearches: toNum(traffic.total_searches),
      totalEvents: toNum(traffic.total_events),
    },
    businesses: {
      total: toNum(businessStats.total),
      active: toNum(businessStats.active),
      pending: toNum(businessStats.pending),
      newInPeriod: toNum(businessStats.new_count),
    },
    advertising: {
      impressions,
      clicks: adClicks,
      ctr: calcCtr(adClicks, impressions),
      activeCampaigns: toNum(activeCampaigns.count),
    },
  };
}

// analytics: admin traffic — profile views, searches, popular queries, most-viewed businesses
export async function getAdminAnalyticsTraffic(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const [summary] = await query(analyticsStatements.adminTrafficSummary, [startStr, endStr]);
  const popularSearches = await query(analyticsStatements.adminPopularSearches, [startStr, endStr]);
  const mostViewed = await query(analyticsStatements.adminMostViewedBusinesses, [startStr, endStr]);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    profileViews: toNum(summary.profile_views),
    totalSearches: toNum(summary.total_searches),
    popularSearches: popularSearches.map((r) => ({
      query: r.search_query,
      count: toNum(r.count),
    })),
    mostViewedBusinesses: mostViewed.map((r) => ({
      id: toNum(r.id),
      name: r.name,
      slug: r.slug,
      views: toNum(r.view_count),
    })),
  };
}

// analytics: admin businesses — totals by status, new registrations, most viewed/saved
export async function getAdminAnalyticsBusinesses(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const [stats] = await query(analyticsStatements.adminBusinessStats, [startStr]);
  const byStatus = await query(analyticsStatements.adminBusinessesByStatus);
  const mostViewed = await query(analyticsStatements.adminMostViewedBusinesses, [startStr, endStr]);
  const mostSaved = await query(analyticsStatements.adminMostSavedBusinesses, [startStr, endStr]);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    total: toNum(stats.total),
    active: toNum(stats.active),
    pending: toNum(stats.pending),
    newInPeriod: toNum(stats.new_count),
    byStatus: byStatus.map((r) => ({
      status: r.listing_status,
      count: toNum(r.count),
    })),
    mostViewedBusinesses: mostViewed.map((r) => ({
      id: toNum(r.id),
      name: r.name,
      slug: r.slug,
      views: toNum(r.view_count),
    })),
    mostSavedBusinesses: mostSaved.map((r) => ({
      id: toNum(r.id),
      name: r.name,
      slug: r.slug,
      saves: toNum(r.save_count),
    })),
  };
}

// analytics: admin categories — most active categories by event volume
export async function getAdminAnalyticsCategories(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const categories = await query(analyticsStatements.adminCategoryTraffic, [startStr, endStr]);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    categories: categories.map((r) => ({
      id: toNum(r.id),
      name: r.name,
      slug: r.slug,
      eventCount: toNum(r.event_count),
    })),
  };
}

// analytics: admin locations — most active areas and cities by interaction volume
export async function getAdminAnalyticsLocations(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const locations = await query(analyticsStatements.adminLocationStats, [startStr, endStr]);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    locations: locations.map((r) => ({
      area: r.area,
      city: r.city,
      interactions: toNum(r.view_count),
    })),
  };
}

// analytics: admin advertising — platform-wide impressions, clicks, CTR, top advertisers
export async function getAdminAnalyticsAdvertising(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const [adSummary] = await query(analyticsStatements.adminAdvertisingSummary, [startStr, endStr]);
  const [activeCampaigns] = await query(analyticsStatements.adminActiveCampaigns);
  const topAdvertisers = await query(analyticsStatements.adminTopAdvertisers, [startStr, endStr]);

  const impressions = toNum(adSummary.total_impressions);
  const clicks = toNum(adSummary.total_clicks);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    impressions,
    clicks,
    ctr: calcCtr(clicks, impressions),
    activeCampaigns: toNum(activeCampaigns.count),
    topAdvertisers: topAdvertisers.map((r) => ({
      id: toNum(r.id),
      name: r.name,
      impressions: toNum(r.impressions),
    })),
  };
}

// analytics: admin revenue — paid transaction totals by type with recent transaction list
export async function getAdminAnalyticsRevenue(queryParams) {
  const { start, end } = resolveDateRange(queryParams);
  const startStr = toMySQLDateTime(start);
  const endStr = toMySQLDateTime(end);

  const summary = await query(analyticsStatements.adminRevenueSummary, [startStr, endStr]);
  const transactions = await query(analyticsStatements.adminRevenueTransactions, [startStr, endStr]);

  const totalPaid = summary.reduce((acc, r) => acc + Number(r.total ?? 0), 0);

  return {
    period: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    },
    totalRevenue: Number(totalPaid.toFixed(2)),
    currency: summary[0]?.currency ?? "NGN",
    byType: summary.map((r) => ({
      type: r.transaction_type,
      total: Number(Number(r.total ?? 0).toFixed(2)),
      count: toNum(r.count),
    })),
    recentTransactions: transactions.map((r) => ({
      id: toNum(r.id),
      businessName: r.business_name,
      type: r.transaction_type,
      amount: Number(Number(r.amount ?? 0).toFixed(2)),
      currency: r.currency,
      status: r.status,
      paidAt: r.paid_at,
      createdAt: r.created_at,
    })),
  };
}
