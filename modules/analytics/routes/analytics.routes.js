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

/**
 * @openapi
 * /analytics/business:
 *   get:
 *     tags: [Analytics]
 *     summary: Get performance analytics for authenticated business
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date, example: "2026-01-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date, example: "2026-01-31" }
 *     responses:
 *       200:
 *         description: Business analytics metrics and timeline data.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/business", requireBusinessAuth, validateAnalyticsQuery, businessAnalytics);

// ─── Admin routes ─────────────────────────────────────────────────────────────

/**
 * @openapi
 * /analytics/admin/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Overall platform high-level snapshot (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: High-level platform metrics overview.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/overview", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsOverview);

/**
 * @openapi
 * /analytics/admin/traffic:
 *   get:
 *     tags: [Analytics]
 *     summary: Consumer traffic, views and search trends (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *     responses:
 *       200:
 *         description: Traffic analytics and breakdown.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/traffic", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsTraffic);

/**
 * @openapi
 * /analytics/admin/businesses:
 *   get:
 *     tags: [Analytics]
 *     summary: Business listings count, status breakdown and top performers (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *     responses:
 *       200:
 *         description: Business listings analytics.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/businesses", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsBusinesses);

/**
 * @openapi
 * /analytics/admin/categories:
 *   get:
 *     tags: [Analytics]
 *     summary: Category activity and distribution (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *     responses:
 *       200:
 *         description: Category distribution and performance.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/categories", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsCategories);

/**
 * @openapi
 * /analytics/admin/locations:
 *   get:
 *     tags: [Analytics]
 *     summary: Geographic distribution of searches and listings (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *     responses:
 *       200:
 *         description: Geographic location analytics.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/locations", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsLocations);

/**
 * @openapi
 * /analytics/admin/advertising:
 *   get:
 *     tags: [Analytics]
 *     summary: Advertising campaign metrics, impressions and click rates (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *     responses:
 *       200:
 *         description: Advertising performance overview.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/advertising", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsAdvertising);

/**
 * @openapi
 * /analytics/admin/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Revenue and monetization metrics (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, 7d, 30d], default: 30d }
 *     responses:
 *       200:
 *         description: Platform revenue breakdown.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/admin/revenue", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsRevenue);

export default router;
