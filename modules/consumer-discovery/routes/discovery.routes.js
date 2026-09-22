/**
 * Consumer Discovery Routes
 * All endpoints are public — no authentication required.
 * Mounted at /api/v1/discovery in APP.JS.
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

// Aggregated homepage
router.get("/home", getHome);

// Full-text + filter search
router.get("/search", validateSearch, search);

// Category listing and browsing
router.get("/categories", listCategories);
router.get("/category/:slug", validateCategoryBrowse, getCategoryBusinesses);

// Curated sections
router.get("/featured", getFeatured);
router.get("/popular", getPopular);
router.get("/promotions", getPromotions);
router.get("/advertisements", getAdvertisements);

export default router;
