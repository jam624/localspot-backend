import { Router } from "express";
import { requireBusinessAuth } from "../../middleware/businessAuth.middleware.js";
import {
  listForBusiness,
  updateStatus,
} from "./reservations.controller.js";
import {
  validateReservationId,
  validateReservationListQuery,
  validateReservationStatus,
} from "./reservations.validator.js";

const router = Router();
router.use(requireBusinessAuth);

/**
 * @openapi
 * /business/reservations:
 *   get:
 *     tags: [Business Portal]
 *     summary: List reservations for businesses owned by the current account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated reservations with customer details }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get("/", validateReservationListQuery, listForBusiness);

/**
 * @openapi
 * /business/reservations/{id}/status:
 *   patch:
 *     tags: [Business Portal]
 *     summary: Update an owned reservation's status
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [confirmed, rejected, completed] }
 *     responses:
 *       200: { description: Reservation status updated }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch("/:id/status", validateReservationId, validateReservationStatus, updateStatus);

export default router;
