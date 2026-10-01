/**
 * Location Routes
 * Geocoding/location endpoints — all public, no authentication required.
 * Mounted at /api/v1/location in app.js.
 */

import { Router } from "express";

import {
  locationReverse,
  locationSearch,
} from "../controllers/location.controller.js";
import {
  validateLocationSearch,
  validateReverseGeocode,
} from "../validators/location.validator.js";

const router = Router();

/**
 * @openapi
 * /location/search:
 *   get:
 *     tags: [Location]
 *     summary: Forward geocode a location name
 *     description: Resolves a query string (place name or address) into coordinates and structured address info.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query (e.g. "Ikeja Lagos")
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 10, default: 5 }
 *     responses:
 *       200:
 *         description: Matching locations found.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.get("/search", validateLocationSearch, locationSearch);

/**
 * @openapi
 * /location/reverse:
 *   get:
 *     tags: [Location]
 *     summary: Reverse geocode coordinates to an address
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number, minimum: -90, maximum: 90 }
 *       - in: query
 *         name: lon
 *         required: true
 *         schema: { type: number, minimum: -180, maximum: 180 }
 *     responses:
 *       200:
 *         description: Reverse geocoded address.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/reverse", validateReverseGeocode, locationReverse);

export default router;
