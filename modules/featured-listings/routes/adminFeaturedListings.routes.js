import { Router } from "express";

import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";
import {
  adminActivate,
  adminApprove,
  adminDisable,
  adminGetOne,
  adminList,
  adminReject,
} from "../controllers/featuredListings.controller.js";
import {
  validateAdminReject,
  validateListQuery,
} from "../validators/featuredListings.validator.js";

const router = Router();

/**
 * @openapi
 * /admin/featured-listings:
 *   get:
 *     tags: [Admin - Featured Listings]
 *     summary: List all featured listing requests
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, pending_approval, approved, rejected, active, expired, disabled]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of all featured listing requests.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", requireAdminAuth, validateListQuery, adminList);

/**
 * @openapi
 * /admin/featured-listings/{id}:
 *   get:
 *     tags: [Admin - Featured Listings]
 *     summary: View a featured listing request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Featured listing request detail.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", requireAdminAuth, adminGetOne);

/**
 * @openapi
 * /admin/featured-listings/{id}/approve:
 *   post:
 *     tags: [Admin - Featured Listings]
 *     summary: Approve a featured listing request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Request approved.
 *       400:
 *         description: Invalid status transition.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/approve", requireAdminAuth, adminApprove);

/**
 * @openapi
 * /admin/featured-listings/{id}/reject:
 *   post:
 *     tags: [Admin - Featured Listings]
 *     summary: Reject a featured listing request
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejection_reason]
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 minLength: 10
 *                 example: "The requested placement slot is fully booked for the requested period."
 *     responses:
 *       200:
 *         description: Request rejected.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/reject", requireAdminAuth, validateAdminReject, adminReject);

/**
 * @openapi
 * /admin/featured-listings/{id}/activate:
 *   post:
 *     tags: [Admin - Featured Listings]
 *     summary: Activate an approved featured listing
 *     description: Sets the request to active and flags the business as featured.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Listing activated. Business is_featured flag set to true.
 *       400:
 *         description: Request must be in approved status.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/activate", requireAdminAuth, adminActivate);

/**
 * @openapi
 * /admin/featured-listings/{id}/disable:
 *   post:
 *     tags: [Admin - Featured Listings]
 *     summary: Disable an active or approved featured listing
 *     description: >
 *       Sets the request to disabled. If the business has no other active
 *       featured listing requests, is_featured is set back to false.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Listing disabled.
 *       400:
 *         description: Invalid status transition.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/disable", requireAdminAuth, adminDisable);

export default router;
