/**
 * Location Routes
 * Geocoding/location endpoints — all public, no authentication required.
 * Mounted at /api/v1/location in APP.JS.
 */

import { Router } from "express";

import {
  locationReverse,
  locationSearch,
} from "../controllers/location.controller.js";
import {
  validateLocationSearch,
  validateReverseGeocode,
} from "../validators/location.validator.js";

const router = Router();

// Forward geocoding: resolve location name → coordinates + address
router.get("/search", validateLocationSearch, locationSearch);

// Reverse geocoding: resolve coordinates → address
router.get("/reverse", validateReverseGeocode, locationReverse);

export default router;
