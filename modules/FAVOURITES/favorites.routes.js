/**
 * Favorites Routes
 * All endpoints are public — no authentication required (no consumer
 * accounts in V1). Mounted at /api/v1/favorites in APP.JS.
 */

import { Router } from "express";

import {
  favorite,
  listFavorites,
  unfavorite,
} from "../controllers/favorites.controller.js";
import {
  validateBusinessId,
  validateListFavorites,
} from "../validators/favorites.validator.js";

const router = Router();

// GET /api/v1/favorites?ids=12,45,90
// Bulk-fetch listing cards for the business IDs stored in the browser's
// localStorage — powers the "My Favorites" page.
router.get("/", validateListFavorites, listFavorites);

// POST /api/v1/favorites/:businessId — log a favorite_add event
router.post("/:businessId", validateBusinessId, favorite);

// DELETE /api/v1/favorites/:businessId — log a favorite_remove event
router.delete("/:businessId", validateBusinessId, unfavorite);

export default router;
