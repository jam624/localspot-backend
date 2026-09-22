import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { checkDatabaseConnection } from "./config/db.js";
import {
  apiRateLimiter,
  authRateLimiter,
} from "./middleware/rateLimiter.middleware.js";
import adminAuthRoutes from "./modules/admin-auth/routes/adminAuth.routes.js";
import businessAuthRoutes from "./modules/business-auth/routes/businessAuth.routes.js";

dotenv.config();

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

app.use("/api/v1/auth/business", authRateLimiter, businessAuthRoutes);
app.use("/api/v1/auth/admin", authRateLimiter, adminAuthRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "A record with this unique value already exists",
    });
  }

  return res.status(error.statusCode || 500).json({
    message: error.message || "Something went wrong",
  });
});

export default app;
