/**
 * Input validators for consumer discovery routes.
 * All discovery endpoints are public — validation targets query parameters only.
 * Follows the same hand-written middleware pattern as business-auth validators.
 */

const VALID_SORTS = ["recommended", "highest-rated", "most-popular", "newest"];

/**
 * Validates common search/filter query parameters.
 * Used directly by /search and composed into /category/:slug.
 */
export function validateSearch(req, res, next) {
  const { rating, priceRange, openNow, sort, page, limit } = req.query;

  if (rating !== undefined) {
    const r = parseFloat(rating);
    if (isNaN(r) || r < 1 || r > 5) {
      return res
        .status(400)
        .json({ message: "rating must be a number between 1 and 5" });
    }
  }

  if (priceRange !== undefined) {
    const pr = parseInt(priceRange, 10);
    if (isNaN(pr) || pr < 1 || pr > 4) {
      return res
        .status(400)
        .json({ message: "priceRange must be 1, 2, 3, or 4" });
    }
  }

  if (openNow !== undefined && openNow !== "true" && openNow !== "false") {
    return res
      .status(400)
      .json({ message: "openNow must be true or false" });
  }

  if (sort !== undefined && !VALID_SORTS.includes(sort)) {
    return res.status(400).json({
      message: `sort must be one of: ${VALID_SORTS.join(", ")}`,
    });
  }

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1) {
      return res
        .status(400)
        .json({ message: "page must be a positive integer" });
    }
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (isNaN(l) || l < 1) {
      return res
        .status(400)
        .json({ message: "limit must be a positive integer" });
    }
  }

  return next();
}

/**
 * GET /api/v1/discovery/category/:slug
 * Ensures slug is present then applies the shared search validator.
 */
export function validateCategoryBrowse(req, res, next) {
  const { slug } = req.params;

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return res.status(400).json({ message: "category slug is required" });
  }

  return validateSearch(req, res, next);
}
