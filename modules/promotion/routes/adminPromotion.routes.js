import { Router } from "express";
import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";
import * as controller from "../controllers/promotion.controller.js";
import {
  validateId,
  validateReject,
} from "../validators/promotion.validator.js";

const router = Router();
router.use(requireAdminAuth);

/**
 * @openapi
 * /admin/promotions:
 *   get:
 *     tags: [Promotions - Admin]
 *     summary: List all promotions for administration
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of promotions.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", controller.listAll);

/**
 * @openapi
 * /admin/promotions/expired:
 *   delete:
 *     tags: [Promotions - Admin]
 *     summary: Bulk delete expired promotions
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Expired promotions removed.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete("/expired", controller.removeExpired);

/**
 * @openapi
 * /admin/promotions/{id}:
 *   get:
 *     tags: [Promotions - Admin]
 *     summary: Get single promotion details (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion details.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Promotions - Admin]
 *     summary: Delete a promotion (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion deleted.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", validateId, controller.getOne);
router.delete("/:id", validateId, controller.remove);

/**
 * @openapi
 * /admin/promotions/{id}/approve:
 *   post:
 *     tags: [Promotions - Admin]
 *     summary: Approve a pending promotion (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion approved.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/approve", validateId, controller.approve);

/**
 * @openapi
 * /admin/promotions/{id}/reject:
 *   post:
 *     tags: [Promotions - Admin]
 *     summary: Reject a pending promotion (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion rejected.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/reject", validateId, validateReject, controller.reject);

/**
 * @openapi
 * /admin/promotions/{id}/disable:
 *   post:
 *     tags: [Promotions - Admin]
 *     summary: Disable an active promotion (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion disabled.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post("/:id/disable", validateId, controller.disable);

export default router;
