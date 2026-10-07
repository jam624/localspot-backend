import "dotenv/config";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";

import { checkDatabaseConnection } from "./config/db.js";
import swaggerSpec from "./config/swagger.js";
import {
  apiRateLimiter,
  authRateLimiter,
} from "./middleware/rateLimiter.middleware.js";

// --- Existing Module Routes ---
import adminAuthRoutes from "./modules/admin-auth/routes/adminAuth.routes.js";
import analyticsRoutes from "./modules/analytics/routes/analytics.routes.js";
import {
  businessAnalytics,
  adminAnalyticsOverview, adminAnalyticsTraffic, adminAnalyticsBusinesses,
  adminAnalyticsCategories, adminAnalyticsLocations, adminAnalyticsAdvertising,
  adminAnalyticsRevenue,
} from "./modules/analytics/controllers/analytics.controller.js";
import { validateAnalyticsQuery } from "./modules/analytics/validators/analytics.validator.js";
import { requireBusinessAuth } from "./middleware/businessAuth.middleware.js";
import { requireAdminAuth } from "./middleware/adminAuth.middleware.js";
import businessAuthRoutes from "./modules/business-auth/routes/businessAuth.routes.js";
import discoveryRoutes from "./modules/consumer-discovery/routes/discovery.routes.js";
import locationRoutes from "./modules/location/routes/location.routes.js";
import advertisementRoutes, { businessRouter as adBusinessRouter, adminRouter as adAdminRouter } from "./modules/advertisement/routes/advertisement.route.js";
import {
  publicRouter as businessPublicRoutes,
  ownerRouter as businessOwnerRoutes,
  adminRouter as businessAdminRoutes,
} from "./modules/Businesslisting/business.routes.js";
import favoritesRoutes from "./modules/favorites/favorites.routes.js";
import businessPromotionRoutes, {
  publicRouter as publicPromotionRoutes,
} from "./modules/promotion/routes/promotion.routes.js";
import adminPromotionRoutes from "./modules/promotion/routes/adminPromotion.routes.js";
import featuredListingsRoutes from "./modules/featured-listings/routes/featuredListings.routes.js";
import adminFeaturedListingsRoutes from "./modules/featured-listings/routes/adminFeaturedListings.routes.js";

// --- NEW Module Routes ---
import eventsRoutes from "./modules/events/events.routes.js";
import categoriesRoutes from "./modules/categories/routes/categories.routes.js";
import adminCategoriesRoutes from "./modules/categories/routes/adminCategories.routes.js";
import businessPortalRoutes from "./modules/business-portal/routes/portal.routes.js";
import adminCoreRoutes from "./modules/admin-core/routes/adminCore.routes.js";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
  })
);
app.use(express.json());

app.get("/api/docs.json", (req, res) => res.json(swaggerSpec));
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Localspot API Docs",
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "localspot-api" });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "localspot-api" });
});

app.get("/api/v1/health/db", async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/", apiRateLimiter);

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth/business", authRateLimiter, businessAuthRoutes);
app.use("/api/v1/auth/admin", authRateLimiter, adminAuthRoutes);

// ── Analytics ─────────────────────────────────────────────────────────────────
// Primary analytics paths
app.use("/api/v1/analytics", analyticsRoutes);
// Spec-aligned alias: GET /api/v1/business/analytics -> same as /analytics/business
app.get("/api/v1/business/analytics", requireBusinessAuth, validateAnalyticsQuery, businessAnalytics);
// Spec-aligned admin analytics aliases
app.get("/api/v1/admin/analytics/overview",    requireAdminAuth, validateAnalyticsQuery, adminAnalyticsOverview);
app.get("/api/v1/admin/analytics/traffic",     requireAdminAuth, validateAnalyticsQuery, adminAnalyticsTraffic);
app.get("/api/v1/admin/analytics/businesses",  requireAdminAuth, validateAnalyticsQuery, adminAnalyticsBusinesses);
app.get("/api/v1/admin/analytics/categories",  requireAdminAuth, validateAnalyticsQuery, adminAnalyticsCategories);
app.get("/api/v1/admin/analytics/locations",   requireAdminAuth, validateAnalyticsQuery, adminAnalyticsLocations);
app.get("/api/v1/admin/analytics/advertising", requireAdminAuth, validateAnalyticsQuery, adminAnalyticsAdvertising);
app.get("/api/v1/admin/analytics/revenue",     requireAdminAuth, validateAnalyticsQuery, adminAnalyticsRevenue);

// ── Events (NEW) ──────────────────────────────────────────────────────────────
app.use("/api/v1/events", eventsRoutes);

// ── Consumer Discovery ────────────────────────────────────────────────────────
app.use("/api/v1/discovery", discoveryRoutes);

// ── Location / Geocoding ──────────────────────────────────────────────────────
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/locations", locationRoutes);    // spec uses plural

// ── Businesses (public) ───────────────────────────────────────────────────────
app.use("/api/v1/businesses", businessPublicRoutes);

// ── Categories (standalone — NEW) ────────────────────────────────────────────
app.use("/api/v1/categories", categoriesRoutes);

// ── Promotions (public) ───────────────────────────────────────────────────────
app.use("/api/v1/promotions", publicPromotionRoutes);

// ── Favorites ─────────────────────────────────────────────────────────────────
app.use("/api/v1/favorites", favoritesRoutes);

// ── Advertisements (business + admin) ────────────────────────────────────────
app.use("/api/v1/advertisements", advertisementRoutes);
// Spec-aligned: business CRUD at /advertisements directly (without /business sub-path)
app.use("/api/v1/advertisements", adBusinessRouter);
// Admin advertisement management
app.use("/api/v1/admin/advertisements", adAdminRouter);

// ── Featured Listings ─────────────────────────────────────────────────────────
app.use("/api/v1/featured-listings/requests", featuredListingsRoutes);

// ── Business Portal ───────────────────────────────────────────────────────────
// Existing: portal/businesses (create/list/update listings)
app.use("/api/v1/portal/businesses", businessOwnerRoutes);
// Business analytics alias (must be before the /business catch-all)
// (already registered above as app.get)
// Business promotions — MUST be before /business portal catch-all
app.use("/api/v1/business/promotions", businessPromotionRoutes);
// NEW: /business/* routes (dashboard, profile, media, listing lifecycle)
app.use("/api/v1/business", businessPortalRoutes);

// ── Admin ──────────────────────────────────────────────────────────────────────
app.use("/api/v1/admin/businesses", businessAdminRoutes);
app.use("/api/v1/admin/promotions", adminPromotionRoutes);
app.use("/api/v1/admin/featured-listings", adminFeaturedListingsRoutes);
app.use("/api/v1/admin/categories", adminCategoriesRoutes);   // NEW
app.use("/api/v1/admin", adminCoreRoutes);                    // NEW — dashboard + revenue

// ── Fallbacks ─────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "A record with this unique value already exists",
    });
  }

  const status = error.statusCode || 500;
  // Surface client + upstream service errors (4xx, 503, 504); hide unexpected 500s
  const expose = status < 500 || status === 503 || status === 504;
  return res.status(status).json({
    message: expose ? (error.message || "Request failed") : "Something went wrong",
  });
});

export default app;
