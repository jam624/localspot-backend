import { Router } from "express";
import { recordEvent } from "./events.controller.js";
import { validateEvent } from "./events.validator.js";

const router = Router();

/**
 * @openapi
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Track a consumer interaction event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event]
 *             properties:
 *               event:
 *                 type: string
 *                 enum: [business_view, search, phone_click, whatsapp_click, website_click,
 *                         directions_click, favorite_add, favorite_remove,
 *                         advertisement_impression, advertisement_click, promotion_view, business_share]
 *               businessId: { type: integer }
 *               advertisementId: { type: integer }
 *               promotionId: { type: integer }
 *               categoryId: { type: integer }
 *               searchQuery: { type: string }
 *               platform: { type: string }
 *               metadata: { type: object }
 *     responses:
 *       201:
 *         description: Event recorded successfully.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/", validateEvent, recordEvent);

export default router;
