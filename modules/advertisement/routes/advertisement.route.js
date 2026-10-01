// backend/routes/advertisementRoutes.js

import express from "express";
import * as ad from "../controllers/advertisement.controller.js";

// From this route directory, three parent traversals reach the project root.
import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";

const router = express.Router();

/* ==========================================================================
   PUBLIC ROUTES
   No auth required — used by clients/frontends to render the ad creation form.
   ========================================================================== */

/**
 * @openapi
 * /advertisements/types:
 *   get:
 *     tags: [Advertisements]
 *     summary: List active advertisement types
 *     responses:
 *       200:
 *         description: List of available advertisement types.
 */
router.get("/types", ad.listAdvertisementTypes);

/**
 * @openapi
 * /advertisements/slots:
 *   get:
 *     tags: [Advertisements]
 *     summary: List active advertisement placement slots
 *     responses:
 *       200:
 *         description: List of advertisement placement slots.
 */
router.get("/slots", ad.listAdvertisementSlots);

/* ==========================================================================
   BUSINESS ROUTES
   Mounted at /api/advertisements/business
   Requires a valid business account session.
   ========================================================================== */

const businessRouter = express.Router();
businessRouter.use(requireBusinessAuth);

/**
 * @openapi
 * /advertisements/business:
 *   post:
 *     tags: [Advertisements - Business]
 *     summary: Create a new draft advertisement
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type_id, slot_id, target_url, image_url, start_date, end_date]
 *             properties:
 *               title: { type: string, example: "Summer Promo Banner" }
 *               type_id: { type: integer, example: 1 }
 *               slot_id: { type: integer, example: 2 }
 *               target_url: { type: string, example: "https://example.com/promo" }
 *               image_url: { type: string, example: "https://example.com/banner.jpg" }
 *               start_date: { type: string, format: date-time }
 *               end_date: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Draft advertisement created.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   get:
 *     tags: [Advertisements - Business]
 *     summary: List all advertisements owned by authenticated business
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of advertisements.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.post("/", ad.createAdvertisement);
businessRouter.get("/", ad.listMyAdvertisements);

/**
 * @openapi
 * /advertisements/business/{id}:
 *   get:
 *     tags: [Advertisements - Business]
 *     summary: Get single advertisement owned by business
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Advertisement details.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags: [Advertisements - Business]
 *     summary: Update draft or rejected advertisement
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
 *               target_url: { type: string }
 *               image_url: { type: string }
 *               start_date: { type: string, format: date-time }
 *               end_date: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Advertisement updated.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   delete:
 *     tags: [Advertisements - Business]
 *     summary: Delete a draft or rejected advertisement
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Advertisement deleted.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.get("/:id", ad.getMyAdvertisement);
businessRouter.put("/:id", ad.updateMyAdvertisement);
businessRouter.delete("/:id", ad.deleteMyAdvertisement);

/**
 * @openapi
 * /advertisements/business/{id}/submit:
 *   post:
 *     tags: [Advertisements - Business]
 *     summary: Submit an advertisement for approval
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Submitted for approval.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.post("/:id/submit", ad.submitMyAdvertisement);

/**
 * @openapi
 * /advertisements/business/{id}/pause:
 *   post:
 *     tags: [Advertisements - Business]
 *     summary: Pause an active advertisement
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Advertisement paused.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.post("/:id/pause", ad.pauseMyAdvertisement);

/**
 * @openapi
 * /advertisements/business/{id}/resume:
 *   post:
 *     tags: [Advertisements - Business]
 *     summary: Resume a paused advertisement
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Advertisement resumed.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.post("/:id/resume", ad.resumeMyAdvertisement);

/**
 * @openapi
 * /advertisements/business/{id}/performance:
 *   get:
 *     tags: [Advertisements - Business]
 *     summary: Get performance metrics (impressions, clicks, CTR)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Performance statistics.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
businessRouter.get("/:id/performance", ad.getMyAdvertisementPerformance);

router.use("/business", businessRouter);

/* ==========================================================================
   ADMIN ROUTES
   Mounted at /api/advertisements/admin
   Requires a valid admin session.
   ========================================================================== */

const adminRouter = express.Router();
adminRouter.use(requireAdminAuth);

/**
 * @openapi
 * /advertisements/admin/stats:
 *   get:
 *     tags: [Advertisements - Admin]
 *     summary: High-level advertisement statistics (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Advertisement statistics overview.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.get("/stats", ad.adminAdvertisementStats);

/**
 * @openapi
 * /advertisements/admin/types:
 *   get:
 *     tags: [Advertisements - Admin]
 *     summary: List all advertisement types (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of ad types.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Advertisements - Admin]
 *     summary: Create an advertisement type (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Ad type created.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.get("/types", ad.adminListAdvertisementTypes);
adminRouter.post("/types", ad.adminCreateAdvertisementType);

/**
 * @openapi
 * /advertisements/admin/types/{id}:
 *   put:
 *     tags: [Advertisements - Admin]
 *     summary: Update an advertisement type (Admin)
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
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Ad type updated.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.put("/types/:id", ad.adminUpdateAdvertisementType);

/**
 * @openapi
 * /advertisements/admin/slots:
 *   get:
 *     tags: [Advertisements - Admin]
 *     summary: List all advertisement slots (Admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of ad slots.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Advertisements - Admin]
 *     summary: Create an advertisement slot (Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, identifier, max_capacity]
 *             properties:
 *               name: { type: string }
 *               identifier: { type: string }
 *               max_capacity: { type: integer }
 *     responses:
 *       201:
 *         description: Ad slot created.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.get("/slots", ad.adminListAdvertisementSlots);
adminRouter.post("/slots", ad.adminCreateAdvertisementSlot);

/**
 * @openapi
 * /advertisements/admin/slots/{id}:
 *   put:
 *     tags: [Advertisements - Admin]
 *     summary: Update an advertisement slot (Admin)
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
 *               name: { type: string }
 *               max_capacity: { type: integer }
 *     responses:
 *       200:
 *         description: Ad slot updated.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.put("/slots/:id", ad.adminUpdateAdvertisementSlot);

/**
 * @openapi
 * /advertisements/admin:
 *   get:
 *     tags: [Advertisements - Admin]
 *     summary: List all advertisements with administrative filters (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: business_id
 *         schema: { type: integer }
 *       - in: query
 *         name: slot_id
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: offset
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of advertisements.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.get("/", ad.adminListAdvertisements);

/**
 * @openapi
 * /advertisements/admin/{id}:
 *   get:
 *     tags: [Advertisements - Admin]
 *     summary: Get single advertisement details with administrative metadata (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detailed advertisement info.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags: [Advertisements - Admin]
 *     summary: Delete an advertisement (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Advertisement deleted.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.get("/:id", ad.adminGetAdvertisement);
adminRouter.delete("/:id", ad.adminDeleteAdvertisement);

/**
 * @openapi
 * /advertisements/admin/{id}/approve:
 *   post:
 *     tags: [Advertisements - Admin]
 *     summary: Approve a pending advertisement (Admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Advertisement approved.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.post("/:id/approve", ad.adminApproveAdvertisement);

/**
 * @openapi
 * /advertisements/admin/{id}/reject:
 *   post:
 *     tags: [Advertisements - Admin]
 *     summary: Reject a pending advertisement (Admin)
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Image resolution too low" }
 *     responses:
 *       200:
 *         description: Advertisement rejected.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.post("/:id/reject", ad.adminRejectAdvertisement);

/**
 * @openapi
 * /advertisements/admin/{id}/status:
 *   patch:
 *     tags: [Advertisements - Admin]
 *     summary: Manually override advertisement status (Admin)
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
 *               status: { type: string, enum: [draft, pending_approval, approved, rejected, scheduled, active, paused, expired] }
 *     responses:
 *       200:
 *         description: Advertisement status updated.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.patch("/:id/status", ad.adminSetAdvertisementStatus);

router.use("/admin", adminRouter);

export default router;
