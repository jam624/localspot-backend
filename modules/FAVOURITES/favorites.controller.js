/**
 * Favorites Controller
 * Thin controllers — delegate all logic to favorites.service.js.
 * Error handling follows the existing project pattern: catch + next(error).
 */

import {
  addFavorite,
  getFavoriteBusinesses,
  removeFavorite,
} from "../services/favorites.service.js";

/**
 * Pulls the anonymous-tracking fields out of the request.
 * visitorId is optional — the frontend can generate a random ID, store it
 * in localStorage next to the favorites list, and send it via the
 * x-visitor-id header so repeat actions from the same browser can be
 * correlated later (still no accounts, still no PII).
 */
function requestMeta(req) {
  return {
    visitorId: req.headers["x-visitor-id"] || req.body?.visitorId || null,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || null,
  };
}

/**
 * GET /api/v1/favorites?ids=12,45,90
 * Returns listing cards for the business IDs the browser has stored.
 * validateListFavorites (route middleware) parses and sanitises `ids`
 * into req.parsedIds before this runs.
 */
export async function listFavorites(req, res, next) {
  try {
    const result = await getFavoriteBusinesses(req.parsedIds);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/favorites/:businessId
 * Logs a favorite_add event. 404s if the business doesn't exist or isn't
 * publicly visible.
 */
export async function favorite(req, res, next) {
  try {
    await addFavorite(req.params.businessId, requestMeta(req));
    return res.status(201).json({ message: "Added to favorites" });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/v1/favorites/:businessId
 * Logs a favorite_remove event.
 */
export async function unfavorite(req, res, next) {
  try {
    await removeFavorite(req.params.businessId, requestMeta(req));
    return res.status(200).json({ message: "Removed from favorites" });
  } catch (error) {
    return next(error);
  }
}
