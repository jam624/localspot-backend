import { Router } from "express";

import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";
import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import {
  adminAnalyticsAdvertising,
  adminAnalyticsBusinesses,
  adminAnalyticsCategories,
  adminAnalyticsLocations,
  adminAnalyticsOverview,
  adminAnalyticsRevenue,
  adminAnalyticsTraffic,
  businessAnalytics,
} from "../controllers/analytics.controller.js";
import { validateAnalyticsQuery } from "../validators/analytics.validator.js";

const router = Router();

// ─── Business routes ─────────────────────────────────────────────────────────

// route: GET /api/v1/analytics/business — business auth required
router.get("/business", requireBusinessAuth, validateAnalyticsQuery, businessAnalytics);

// ─── Admin routes ─────────────────────────────────────────────────────────────

// route: GET /api/v1/analytics/admin/overview — admin auth required
router.get("/admin/overview", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsOverview);

// route: GET /api/v1/analytics/admin/traffic — admin auth required
router.get("/admin/traffic", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsTraffic);

// route: GET /api/v1/analytics/admin/businesses — admin auth required
router.get("/admin/businesses", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsBusinesses);

// route: GET /api/v1/analytics/admin/categories — admin auth required
router.get("/admin/categories", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsCategories);

// route: GET /api/v1/analytics/admin/locations — admin auth required
router.get("/admin/locations", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsLocations);

// route: GET /api/v1/analytics/admin/advertising — admin auth required
router.get("/admin/advertising", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsAdvertising);

// route: GET /api/v1/analytics/admin/revenue — admin auth required
router.get("/admin/revenue", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsRevenue);

export default router;
