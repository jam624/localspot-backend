/**
 * Location Controller
 * Thin controllers for geocoding endpoints.
 * Follows the existing project pattern: catch + next(error).
 */

import {
  reverseGeocode,
  searchLocation,
} from "../services/geocoding.service.js";

/**
 * GET /api/v1/location/search?q=GRA+Port+Harcourt&limit=5
 *
 * Forward geocoding — resolves a location name to coordinates and address.
 * Calls Nominatim via GeocodingService; raw Nominatim response is never
 * returned directly to the client.
 */
export async function locationSearch(req, res, next) {
  try {
    const { q, limit } = req.query;
    const results = await searchLocation(q, limit);
    return res.status(200).json({ locations: results });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/v1/location/reverse?lat=4.8156&lon=7.0498
 *
 * Reverse geocoding — resolves coordinates to a human-readable address.
 */
export async function locationReverse(req, res, next) {
  try {
    const { lat, lon } = req.query;
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lon));

    if (!result) {
      return res
        .status(404)
        .json({ message: "No location found for these coordinates" });
    }

    return res.status(200).json({ location: result });
  } catch (error) {
    return next(error);
  }
}
