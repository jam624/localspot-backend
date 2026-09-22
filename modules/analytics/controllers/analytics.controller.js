import {
  getAdminAnalyticsAdvertising,
  getAdminAnalyticsBusinesses,
  getAdminAnalyticsCategories,
  getAdminAnalyticsLocations,
  getAdminAnalyticsOverview,
  getAdminAnalyticsRevenue,
  getAdminAnalyticsTraffic,
  getBusinessAnalytics,
} from "../services/analytics.service.js";

// ─── Business ────────────────────────────────────────────────────────────────

// controller: GET /api/v1/analytics/business — analytics for the logged-in business
export async function businessAnalytics(req, res, next) {
  try {
    const data = await getBusinessAnalytics(req.businessAccount.id, req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

// controller: GET /api/v1/analytics/admin/overview — high-level platform snapshot
export async function adminAnalyticsOverview(req, res, next) {
  try {
    const data = await getAdminAnalyticsOverview(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/analytics/admin/traffic — consumer activity (views, searches)
export async function adminAnalyticsTraffic(req, res, next) {
  try {
    const data = await getAdminAnalyticsTraffic(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/analytics/admin/businesses — business counts and top listings
export async function adminAnalyticsBusinesses(req, res, next) {
  try {
    const data = await getAdminAnalyticsBusinesses(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/analytics/admin/categories — most active categories
export async function adminAnalyticsCategories(req, res, next) {
  try {
    const data = await getAdminAnalyticsCategories(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/analytics/admin/locations — most active areas and cities
export async function adminAnalyticsLocations(req, res, next) {
  try {
    const data = await getAdminAnalyticsLocations(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/analytics/admin/advertising — platform-wide ad performance
export async function adminAnalyticsAdvertising(req, res, next) {
  try {
    const data = await getAdminAnalyticsAdvertising(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

// controller: GET /api/v1/analytics/admin/revenue — paid transaction summary
export async function adminAnalyticsRevenue(req, res, next) {
  try {
    const data = await getAdminAnalyticsRevenue(req.query);
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}
