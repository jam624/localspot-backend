import { Router } from "express";
import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import * as controller from "../controllers/promotion.controller.js";
import {
  validateCreate,
  validateId,
  validateUpdate,
} from "../validators/promotion.validator.js";

export const publicRouter = Router();

/**
 * @openapi
 * /promotions:
 *   get:
 *     tags: [Promotions]
 *     summary: List active public promotions
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of active promotions.
 */
publicRouter.get("/", controller.listPublic);

/**
 * @openapi
 * /promotions/{id}:
 *   get:
 *     tags: [Promotions]
 *     summary: Get single public promotion details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion details.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
publicRouter.get("/:id", validateId, controller.getOne);

const businessRouter = Router();
businessRouter.use(requireBusinessAuth);

/**
 * @openapi
 * /business/promotions:
 *   get:
 *     tags: [Promotions - Business]
 *     summary: List promotions owned by authenticated business
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of promotions.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Promotions - Business]
 *     summary: Create a new promotion
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, startDate, endDate]
 *             properties:
 *               title: { type: string, example: "Buy 1 Get 1 Free" }
 *               description: { type: string, example: "Order any pizza and get a second free on Fridays" }
 *               imageUrl: { type: string, example: "https://example.com/promo.jpg" }
 *               discountLabel: { type: string, example: "50% OFF" }
 *               startDate: { type: string, format: date-time, example: "2026-10-01T00:00:00.000Z" }
 *               endDate: { type: string, format: date-time, example: "2026-10-31T23:59:59.000Z" }
 *     responses:
 *       201:
 *         description: Promotion created.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.get("/mine/all", controller.listMine);
businessRouter.get("/", controller.listMine);
businessRouter.post("/", validateCreate, controller.create);

/**
 * @openapi
 * /business/promotions/{id}:
 *   get:
 *     tags: [Promotions - Business]
 *     summary: Get single owned promotion
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
 *   put:
 *     tags: [Promotions - Business]
 *     summary: Update an owned promotion
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
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               imageUrl: { type: string }
 *               discountLabel: { type: string }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Promotion updated.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Promotions - Business]
 *     summary: Delete an owned promotion
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
businessRouter.get("/:id", validateId, controller.getOne);
businessRouter.put("/:id", validateId, validateUpdate, controller.update);
businessRouter.delete("/:id", validateId, controller.remove);

/**
 * @openapi
 * /business/promotions/{id}/submit:
 *   post:
 *     tags: [Promotions - Business]
 *     summary: Submit a promotion for review
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Promotion submitted for review.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
businessRouter.post("/:id/submit", validateId, controller.submitForReview);

export default businessRouter;
