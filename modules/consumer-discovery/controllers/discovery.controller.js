/**
 * Consumer Discovery Controller
 * Thin controllers — delegate all business logic to discovery.service.js.
 * Error handling follows the existing project pattern: catch + next(error).
 */

import {
  getActiveAdvertisements,
  getActivePromotions,
  getBusinessesByCategory,
  getCategories,
  getFeaturedBusinesses,
  getHomepageData,
  getPopularBusinesses,
  searchBusinesses,
} from "../services/discovery.service.js";

/**
 * GET /api/v1/discovery/home
 * Returns categories, featured businesses, popular businesses,
 * promotions, and advertisements in a single aggregated response.
 */
export async function getHome(req, res, next) {
  try {
    const data = await getHomepageData();
    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/search
 * Supports: q, category, location, rating, priceRange, openNow, sort, page, limit
 */
export async function search(req, res, next) {
  try {
    const result = await searchBusinesses(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/categories
 * Returns all active categories with business counts.
 */
export async function listCategories(req, res, next) {
  try {
    const categories = await getCategories();
    return res.status(200).json({ categories });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/category/:slug
 * Returns category info + paginated businesses within it.
 * Supports: location, rating, priceRange, openNow, sort, page, limit
 */
export async function getCategoryBusinesses(req, res, next) {
  try {
    const result = await getBusinessesByCategory(
      req.params.slug,
      req.query
    );
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/featured
 * Returns paginated featured businesses (is_featured = 1).
 */
export async function getFeatured(req, res, next) {
  try {
    const result = await getFeaturedBusinesses(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/popular
 * Returns paginated popular businesses sorted by review count and rating.
 */
export async function getPopular(req, res, next) {
  try {
    const result = await getPopularBusinesses(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/promotions
 * Returns paginated active promotions.
 */
export async function getPromotions(req, res, next) {
  try {
    const result = await getActivePromotions(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/discovery/advertisements
 * Returns paginated active advertisements.
 */
export async function getAdvertisements(req, res, next) {
  try {
    const result = await getActiveAdvertisements(req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
