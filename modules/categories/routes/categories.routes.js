import { Router } from "express";
import { listCategories, getCategory, listCategoryBusinesses } from "../categories.controller.js";

const router = Router();

/** GET /api/v1/categories — all active categories with business count */
router.get("/", listCategories);

/** GET /api/v1/categories/:idOrSlug — single category */
router.get("/:idOrSlug", getCategory);

/** GET /api/v1/categories/:idOrSlug/businesses — businesses in this category */
router.get("/:idOrSlug/businesses", listCategoryBusinesses);

export default router;
