/**
 * Consumer Discovery Routes
 * All endpoints are public — no authentication required.
 * Mounted at /api/v1/discovery in app.js.
 */

import { Router } from "express";

import {
  getAdvertisements,
  getCategoryBusinesses,
  getFeatured,
  getHome,
  getPopular,
  getPromotions,
  listCategories,
  search,
} from "../controllers/discovery.controller.js";
import {
  validateCategoryBrowse,
  validateSearch,
} from "../validators/discovery.validator.js";

const router = Router();

/**
 * @openapi
 * /discovery/home:
 *   get:
 *     tags: [Discovery]
 *     summary: Aggregated consumer homepage feed
 *     description: Returns categories, featured businesses, popular businesses, promotions, and advertisements in a single response.
 *     responses:
 *       200:
 *         description: Aggregated homepage discovery data.
 */
router.get("/home", getHome);

/**
 * @openapi
 * /discovery/search:
 *   get:
 *     tags: [Discovery]
 *     summary: Search and filter businesses
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query term
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug or ID
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: City or area filter
 *       - in: query
 *         name: rating
 *         schema: { type: number, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: priceRange
 *         schema: { type: integer, minimum: 1, maximum: 4 }
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
 *         description: Search results with pagination.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/search", validateSearch, search);

/**
 * @openapi
 * /discovery/categories:
 *   get:
 *     tags: [Discovery]
 *     summary: List all active categories
 *     responses:
 *       200:
 *         description: List of categories with business counts.
 */
router.get("/categories", listCategories);

/**
 * @openapi
 * /discovery/category/{slug}:
 *   get:
 *     tags: [Discovery]
 *     summary: Browse businesses under a specific category
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Category slug
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Category details and businesses list.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/category/:slug", validateCategoryBrowse, getCategoryBusinesses);

/**
 * @openapi
 * /discovery/featured:
 *   get:
 *     tags: [Discovery]
 *     summary: Get featured businesses
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: List of featured businesses.
 */
router.get("/featured", getFeatured);

/**
 * @openapi
 * /discovery/popular:
 *   get:
 *     tags: [Discovery]
 *     summary: Get popular businesses sorted by popularity and rating
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: List of popular businesses.
 */
router.get("/popular", getPopular);

/**
 * @openapi
 * /discovery/promotions:
 *   get:
 *     tags: [Discovery]
 *     summary: Get active promotions feed
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Active promotions.
 */
router.get("/promotions", getPromotions);

/**
 * @openapi
 * /discovery/advertisements:
 *   get:
 *     tags: [Discovery]
 *     summary: Get active advertisements feed
 *     parameters:
 *       - in: query
 *         name: slot
 *         schema: { type: string }
 *         description: Filter by ad slot identifier
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *     responses:
 *       200:
 *         description: Active advertisements.
 */
router.get("/advertisements", getAdvertisements);

export default router;
