/**
 * Favorites Routes
 * All endpoints are public — no authentication required (no consumer
 * accounts in V1). Mounted at /api/v1/favorites in app.js.
 */

import { Router } from "express";

import {
  favorite,
  listFavorites,
  unfavorite,
} from "./favorites.controller.js";
import {
  validateBusinessId,
  validateListFavorites,
} from "./favorites.validator.js";

const router = Router();

/**
 * @openapi
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: Bulk-fetch favorites by business IDs
 *     description: Fetches listing cards for the comma-separated business IDs stored locally on consumer client.
 *     parameters:
 *       - in: query
 *         name: ids
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated business IDs (e.g. "12,45,90")
 *     responses:
 *       200:
 *         description: List of favorite business cards.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/", validateListFavorites, listFavorites);

/**
 * @openapi
 * /favorites/{businessId}:
 *   post:
 *     tags: [Favorites]
 *     summary: Save a business to favorites
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: integer }
 *       - in: header
 *         name: x-visitor-id
 *         schema: { type: string }
 *         description: Optional anonymous tracking identifier
 *     responses:
 *       201:
 *         description: Added to favorites.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Favorites]
 *     summary: Remove a business from favorites
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: integer }
 *       - in: header
 *         name: x-visitor-id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Removed from favorites.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/:businessId", validateBusinessId, favorite);
router.delete("/:businessId", validateBusinessId, unfavorite);

export default router;
