/**
 * Favorites Controller (V2 — user auth)
 * All favorites endpoints now require a logged-in consumer user.
 * req.user is populated by requireUserAuth middleware.
 */

import {
  addFavorite,
  getUserFavorites,
  removeFavorite,
} from "./favorites.service.js";

function requestMeta(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || null,
  };
}

/**
 * GET /api/v1/favorites
 * Returns the authenticated user's saved businesses as listing cards.
 */
export async function listFavorites(req, res, next) {
  try {
    const result = await getUserFavorites(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/favorites/:businessId
 * Adds a business to the authenticated user's favorites.
 */
export async function favorite(req, res, next) {
  try {
    await addFavorite(req.user.id, req.params.businessId, requestMeta(req));
    return res.status(201).json({ message: "Added to favorites" });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/v1/favorites/:businessId
 * Removes a business from the authenticated user's favorites.
 */
export async function unfavorite(req, res, next) {
  try {
    await removeFavorite(req.user.id, req.params.businessId, requestMeta(req));
    return res.status(200).json({ message: "Removed from favorites" });
  } catch (error) {
    return next(error);
  }
}
