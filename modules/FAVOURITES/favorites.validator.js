/**
 * Input validators for favorites routes.
 * All favorites endpoints are public — no authentication required.
 * Follows the same hand-written middleware pattern as discovery.validator.js.
 */

const MAX_IDS_PER_REQUEST = 100;

/**
 * GET /api/v1/favorites?ids=12,45,90
 * Parses the comma-separated `ids` query param into a clean, deduped array
 * of positive integers on req.parsedIds.
 */
export function validateListFavorites(req, res, next) {
  const { ids } = req.query;

  if (!ids || typeof ids !== "string" || !ids.trim()) {
    return res.status(400).json({
      message: "ids query parameter is required, e.g. ?ids=12,45,90",
    });
  }

  const parts = ids.split(",").map((value) => value.trim());
  if (parts.some((value) => !/^[1-9]\d{0,17}$/.test(value))) {
    return res.status(400).json({ message: "ids must be comma-separated positive integers" });
  }
  const parsed = parts.map(Number);

  if (parsed.length === 0) {
    return res.status(400).json({
      message: "ids must contain at least one valid business id",
    });
  }

  if (parsed.length > MAX_IDS_PER_REQUEST) {
    return res.status(400).json({
      message: `A maximum of ${MAX_IDS_PER_REQUEST} ids can be requested at once`,
    });
  }

  // Dedupe while preserving the order the browser sent them in.
  req.parsedIds = [...new Set(parsed)];
  return next();
}

/**
 * POST/DELETE /api/v1/favorites/:businessId
 * Ensures businessId is a positive integer and normalises it to a Number.
 */
export function validateBusinessId(req, res, next) {
  if (!/^[1-9]\d{0,17}$/.test(req.params.businessId)) {
    return res.status(400).json({ message: "businessId must be a positive integer" });
  }
  const id = Number(req.params.businessId);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "businessId must be a positive integer" });
  }

  req.params.businessId = id;
  return next();
}
