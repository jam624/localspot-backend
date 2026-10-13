import { Router } from "express";
import { requireUserAuth } from "../../middleware/userAuth.middleware.js";
import {
  cancelMine,
  create,
  getMine,
  listMine,
} from "./reservations.controller.js";
import {
  validateCreateReservation,
  validateReservationId,
  validateReservationListQuery,
} from "./reservations.validator.js";

const router = Router();
router.use(requireUserAuth);

/**
 * @openapi
 * /reservations:
 *   get:
 *     tags: [Reservations]
 *     summary: List the authenticated user's reservations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated reservations }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     tags: [Reservations]
 *     summary: Request a reservation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessId, reservationAt]
 *             properties:
 *               businessId: { type: integer }
 *               serviceId: { type: integer, nullable: true }
 *               reservationAt: { type: string, format: date-time }
 *               partySize: { type: integer, minimum: 1, maximum: 30 }
 *               notes: { type: string, maxLength: 1000 }
 *     responses:
 *       201: { description: Reservation requested }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/", validateReservationListQuery, listMine);
router.post("/", validateCreateReservation, create);

/**
 * @openapi
 * /reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get one of the authenticated user's reservations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Reservation details }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.get("/:id", validateReservationId, getMine);

/**
 * @openapi
 * /reservations/{id}/cancel:
 *   patch:
 *     tags: [Reservations]
 *     summary: Cancel a pending or confirmed reservation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Reservation cancelled }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.patch("/:id/cancel", validateReservationId, cancelMine);

export default router;
