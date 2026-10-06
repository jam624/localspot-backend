import { Router } from "express";
import { requireBusinessAuth } from "../../middleware/businessAuth.middleware.js";
import { requireAdminAuth } from "../../middleware/adminAuth.middleware.js";
import * as controller from "./business.controller.js";
import { validateActive, validateAdminCreate, validateAdminList, validateAdminUpdate, validateCreate, validateId, validateSearch, validateStatus, validateUpdate } from "./business.validator.js";

import {
  getNearby, searchBusinesses, searchSuggestions,
  getServices, getAmenities, getHours, getMedia,
  getBusinessPromotions, getRelatedBusinesses,
} from "./businessSubResources.js";

export const publicRouter = Router();

/**
 * @openapi
 * /businesses:
 *   get:
 *     tags: [Businesses]
 *     summary: Search and browse public business listings
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search keyword
 *       - in: query
 *         name: categoryId
 *         schema: { type: integer }
 *         description: Filter by category ID
 *       - in: query
 *         name: minRating
 *         schema: { type: number, minimum: 0, maximum: 5 }
 *       - in: query
 *         name: minPrice
 *         schema: { type: integer, minimum: 1, maximum: 4 }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: integer, minimum: 1, maximum: 4 }
 *       - in: query
 *         name: lat
 *         schema: { type: number, minimum: -90, maximum: 90 }
 *       - in: query
 *         name: lng
 *         schema: { type: number, minimum: -180, maximum: 180 }
 *       - in: query
 *         name: radiusKm
 *         schema: { type: number, minimum: 0, maximum: 100 }
 *       - in: query
 *         name: openNow
 *         schema: { type: boolean }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [recommended, rated, popular, newest] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Matching public business listings.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
publicRouter.get("/", validateSearch, controller.listBusinesses);

/**
 * @openapi
 * /businesses/{slug}:
 *   get:
 *     tags: [Businesses]
 *     summary: Get a public business listing by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Business unique URL slug
 *     responses:
 *       200:
 *         description: Business listing details.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
publicRouter.get("/nearby",             getNearby);
publicRouter.get("/search/suggestions", searchSuggestions);
publicRouter.get("/search",             searchBusinesses);
publicRouter.get("/:id/services",  getServices);
publicRouter.get("/:id/amenities", getAmenities);
publicRouter.get("/:id/hours",     getHours);
publicRouter.get("/:id/media",     getMedia);
publicRouter.get("/:id/promotions",getBusinessPromotions);
publicRouter.get("/:id/related",   getRelatedBusinesses);

// README: GET /api/v1/businesses/:businessId — accepts numeric id or slug
publicRouter.get("/:slug", controller.getBySlug);

export const ownerRouter = Router();
ownerRouter.use(requireBusinessAuth);

/**
 * @openapi
 * /portal/businesses:
 *   post:
 *     tags: [Business Portal]
 *     summary: Create a business listing for authenticated owner
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Lagos Kitchen
 *               category:
 *                 type: integer
 *                 example: 2
 *               description:
 *                 type: string
 *                 example: Authentic Nigerian delicacies and catering.
 *               phone:
 *                 type: string
 *                 example: "+2348098765432"
 *               whatsapp:
 *                 type: string
 *                 example: "+2348098765432"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: info@lagoskitchen.ng
 *               website:
 *                 type: string
 *                 example: https://lagoskitchen.ng
 *               address:
 *                 type: string
 *                 example: 12 Marina Street
 *               city:
 *                 type: string
 *                 example: Lagos
 *               area:
 *                 type: string
 *                 example: Lagos Island
 *               priceRange:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *                 example: 2
 *     responses:
 *       201:
 *         description: Business listing created successfully.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   get:
 *     tags: [Business Portal]
 *     summary: List business listings owned by authenticated account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of owner's business listings.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
ownerRouter.post("/", validateCreate, controller.createMine);
ownerRouter.get("/", controller.listMine);

/**
 * @openapi
 * /portal/businesses/{id}:
 *   get:
 *     tags: [Business Portal]
 *     summary: Get single owned business listing details
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Business details.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     tags: [Business Portal]
 *     summary: Update an owned business listing
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
 *               category: { type: integer }
 *               description: { type: string }
 *               phone: { type: string }
 *               whatsapp: { type: string }
 *               email: { type: string, format: email }
 *               website: { type: string }
 *               address: { type: string }
 *               city: { type: string }
 *               area: { type: string }
 *               priceRange: { type: integer, minimum: 1, maximum: 4 }
 *     responses:
 *       200:
 *         description: Business listing updated successfully.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
ownerRouter.get("/:id", validateId, controller.getMine);
ownerRouter.patch("/:id", validateId, validateUpdate, controller.updateMine);

/**
 * @openapi
 * /portal/businesses/{id}/submit:
 *   post:
 *     tags: [Business Portal]
 *     summary: Submit a draft business listing for review/publication
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Business submitted for review.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
ownerRouter.post("/:id/submit", validateId, controller.submitMine);

export const adminRouter = Router();
adminRouter.use(requireAdminAuth);

/**
 * @openapi
 * /admin/businesses:
 *   get:
 *     tags: [Business Administration]
 *     summary: List all business listings for administration
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of business listings.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     tags: [Business Administration]
 *     summary: Create a business listing as an admin
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, owner]
 *             properties:
 *               name: { type: string }
 *               category: { type: integer }
 *               owner: { type: integer, description: "Account ID of owner" }
 *               publish: { type: boolean }
 *               description: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: Business listing created by admin.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
adminRouter.get("/", validateAdminList, controller.adminList);
adminRouter.post("/", validateAdminCreate, controller.adminCreate);

/**
 * @openapi
 * /admin/businesses/{id}:
 *   get:
 *     tags: [Business Administration]
 *     summary: Get single business listing for administration
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detailed business listing.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     tags: [Business Administration]
 *     summary: Admin update of a business listing
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
 *               category: { type: integer }
 *               owner: { type: integer }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Business updated.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
adminRouter.get("/:id", validateId, controller.adminGet);
// README §25 uses PUT; keep PATCH as alias for partial updates
adminRouter.put("/:id", validateId, validateAdminUpdate, controller.adminUpdate);
adminRouter.patch("/:id", validateId, validateAdminUpdate, controller.adminUpdate);

/**
 * @openapi
 * /admin/businesses/{id}/status:
 *   patch:
 *     tags: [Business Administration]
 *     summary: Update business publication/approval status
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
 *               status:
 *                 type: string
 *                 enum: [draft, pending_review, published, rejected, suspended]
 *                 example: published
 *               reason:
 *                 type: string
 *                 description: Required if status is rejected or suspended
 *                 example: Verified business credentials
 *     responses:
 *       200:
 *         description: Status updated successfully.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
adminRouter.patch("/:id/status", validateId, validateStatus, controller.adminSetStatus);

/**
 * @openapi
 * /admin/businesses/{id}/active:
 *   patch:
 *     tags: [Business Administration]
 *     summary: Enable or disable a business listing
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
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Active state updated.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
adminRouter.patch("/:id/active", validateId, validateActive, controller.adminSetActive);


// Spec-aligned action endpoints (wrappers around adminSetStatus)
function statusAction(status) {
  return (req, res, next) => {
    req.body = { ...req.body, status };
    // adminSetStatus reads from req.valid.body (set by validateStatus), so we
    // must populate it here since validateStatus is not in these route chains.
    req.valid = { ...(req.valid || {}), body: { status, reason: req.body.reason } };
    return controller.adminSetStatus(req, res, next);
  };
}
adminRouter.post("/:id/approve",   validateId, statusAction("approved"));
adminRouter.post("/:id/reject",    validateId, statusAction("rejected"));
adminRouter.post("/:id/publish",   validateId, statusAction("published"));
adminRouter.post("/:id/unpublish", validateId, statusAction("draft"));
adminRouter.post("/:id/suspend",   validateId, statusAction("suspended"));
adminRouter.delete("/:id",         validateId, async (req, res, next) => {
  // Soft-delete: set listing_status to suspended and is_active to false
  req.body = { status: "suspended" };
  req.valid = { ...(req.valid || {}), body: { status: "suspended" } };
  return controller.adminSetStatus(req, res, next);
});

export default publicRouter;
