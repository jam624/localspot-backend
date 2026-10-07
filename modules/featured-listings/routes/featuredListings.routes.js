import { Router } from "express";

import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import {
  getMyRequestById,
  listMyRequests,
  submitRequest,
} from "../controllers/featuredListings.controller.js";
import {
  validateCreateRequest,
  validateListQuery,
} from "../validators/featuredListings.validator.js";

const router = Router();

/**
 * @openapi
 * /featured-listings/requests:
 *   post:
 *     tags: [Featured Listings]
 *     summary: Submit a featured listing request
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               placement:
 *                 type: string
 *                 enum: [homepage_featured, category_featured, search_featured]
 *                 default: homepage_featured
 *               category_id:
 *                 type: integer
 *                 description: Optional — target a specific category
 *               requested_start_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-11-01"
 *               requested_end_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-11-30"
 *     responses:
 *       201:
 *         description: Request submitted successfully.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: A pending or active request already exists for this placement.
 */
router.post("/", requireBusinessAuth, validateCreateRequest, submitRequest);

/**
 * @openapi
 * /featured-listings/requests:
 *   get:
 *     tags: [Featured Listings]
 *     summary: List own featured listing requests
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, pending_approval, approved, rejected, active, expired, disabled]
 *     responses:
 *       200:
 *         description: Paginated list of requests.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", requireBusinessAuth, validateListQuery, listMyRequests);

/**
 * @openapi
 * /featured-listings/requests/{id}:
 *   get:
 *     tags: [Featured Listings]
 *     summary: Get a single featured listing request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Request detail.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", requireBusinessAuth, getMyRequestById);

export default router;
