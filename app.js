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

// --- Module Routes ---
import adminAuthRoutes from "./modules/admin-auth/routes/adminAuth.routes.js";
import analyticsRoutes from "./modules/analytics/routes/analytics.routes.js";
import businessAuthRoutes from "./modules/business-auth/routes/businessAuth.routes.js";
import discoveryRoutes from "./modules/consumer-discovery/routes/discovery.routes.js";
import locationRoutes from "./modules/location/routes/location.routes.js";
import advertisementRoutes from "./modules/advertisement/routes/advertisement.route.js";
import { publicRouter as businessPublicRoutes, ownerRouter as businessOwnerRoutes, adminRouter as businessAdminRoutes } from "./modules/Businesslisting/business.routes.js";
import favoritesRoutes from "./modules/FAVOURITES/favorites.routes.js";
import businessPromotionRoutes, {
  publicRouter as publicPromotionRoutes,
} from "./modules/promotion/routes/promotion.routes.js";
import adminPromotionRoutes from "./modules/promotion/routes/adminPromotion.routes.js";

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

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Root and API v1 service health check
 *     responses:
 *       200:
 *         description: Service is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: localspot-api
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "localspot-api",
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "localspot-api",
  });
});

/**
 * @openapi
 * /health/db:
 *   get:
 *     tags: [System]
 *     summary: Database connectivity health check
 *     responses:
 *       200:
 *         description: Database is connected.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 database:
 *                   type: string
 *                   example: connected
 *       500:
 *         description: Database connection failed.
 */
app.get("/api/v1/health/db", async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.status(200).json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/", apiRateLimiter);

// --- API Routes ---
app.use("/api/v1/auth/business", authRateLimiter, businessAuthRoutes);
app.use("/api/v1/auth/admin", authRateLimiter, adminAuthRoutes);

// routes: analytics module — business + admin analytics
app.use("/api/v1/analytics", analyticsRoutes);

// Consumer Discovery — public, unauthenticated
app.use("/api/v1/discovery", discoveryRoutes);

// Location / Geocoding — public, unauthenticated
app.use("/api/v1/location", locationRoutes);

// Advertisements — public types/slots + business + admin management
app.use("/api/v1/advertisements", advertisementRoutes);
app.use("/api/v1/businesses", businessPublicRoutes);
app.use("/api/v1/portal/businesses", businessOwnerRoutes);
app.use("/api/v1/admin/businesses", businessAdminRoutes);
app.use("/api/v1/favorites", favoritesRoutes);
app.use("/api/v1/promotions", publicPromotionRoutes);
app.use("/api/v1/business/promotions", businessPromotionRoutes);
app.use("/api/v1/admin/promotions", adminPromotionRoutes);

// --- Fallback Handlers ---
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
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
  return res.status(status).json({
    message: status < 500 ? error.message : "Something went wrong",
  });
});

export default app;
