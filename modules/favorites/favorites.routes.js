/**
 * Favorites Routes (V2 — user auth required)
 * All endpoints protected by requireUserAuth.
 * Mounted at /api/v1/favorites in app.js.
 */

import { Router } from "express";

import {
  favorite,
  listFavorites,
  unfavorite,
} from "./favorites.controller.js";
import { validateBusinessId } from "./favorites.validator.js";
import { requireUserAuth } from "../../middleware/userAuth.middleware.js";

const router = Router();

// All favorites routes require a logged-in consumer user
router.use(requireUserAuth);

/**
 * @openapi
 * /favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: Get the authenticated user's saved businesses
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of favorited business cards.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businesses:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", listFavorites);

/**
 * @openapi
 * /favorites/{businessId}:
 *   post:
 *     tags: [Favorites]
 *     summary: Save a business to the user's favorites
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Added to favorites.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Favorites]
 *     summary: Remove a business from the user's favorites
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Removed from favorites.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/:businessId", validateBusinessId, favorite);
router.delete("/:businessId", validateBusinessId, unfavorite);

export default router;
