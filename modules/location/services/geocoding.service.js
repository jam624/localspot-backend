/**
 * Geocoding Service — wraps the Nominatim OpenStreetMap API.
 *
 * Architecture:
 *   Frontend → LocalSpot Backend → GeocodingService → Nominatim
 *
 * Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 *   - Identify yourself with a valid User-Agent
 *   - Do not send more than 1 request per second
 *   - Do not use for bulk geocoding or aggressive autocomplete
 *   - Cache results where possible
 *
 * Configuration (via .env):
 *   NOMINATIM_BASE_URL      — defaults to https://nominatim.openstreetmap.org
 *   NOMINATIM_USER_AGENT    — required; identifies LocalSpot to Nominatim
 *   NOMINATIM_TIMEOUT_MS    — HTTP request timeout in ms (default: 5000)
 *   NOMINATIM_COUNTRY_CODES — comma-separated ISO country codes to restrict
 *                             results (default: "ng" for Nigeria)
 *                             Set to empty string to search globally.
 *
 * Uses Node's built-in fetch (Node 18+). Express v5 requires Node 18+,
 * so this is guaranteed available without an extra dependency.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL =
  process.env.NOMINATIM_BASE_URL ||
  "https://nominatim.openstreetmap.org";

const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  "LocalSpot/1.0 (contact@localspot.ng)";

const TIMEOUT_MS = Number(process.env.NOMINATIM_TIMEOUT_MS || 5000);

// Set to empty string to disable country restriction
const COUNTRY_CODES =
  process.env.NOMINATIM_COUNTRY_CODES !== undefined
    ? process.env.NOMINATIM_COUNTRY_CODES
    : "ng";

// ---------------------------------------------------------------------------
// Internal HTTP helper
// ---------------------------------------------------------------------------

/**
 * Makes a GET request to Nominatim with a configurable timeout.
 * Throws structured errors that the global error handler in APP.JS will read.
 *
 * @param {string} path - e.g. "/search" or "/reverse"
 * @param {object} searchParams - key/value query params
 * @returns {Promise<any>} - parsed JSON response
 */
async function nominatimFetch(path, searchParams) {
  const url = new URL(path, BASE_URL);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      const serviceError = new Error(
        "Location service returned an unexpected response"
      );
      serviceError.statusCode = 503;
      throw serviceError;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timer);

    // AbortController fired — request timed out
    if (error.name === "AbortError") {
      const timeout = new Error("Location service request timed out");
      timeout.statusCode = 504;
      throw timeout;
    }

    // Re-throw errors we already structured (503, 504)
    if (error.statusCode) {
      throw error;
    }

    // Unknown network/fetch error — wrap as 503
    const serviceError = new Error(
      "Location service is temporarily unavailable"
    );
    serviceError.statusCode = 503;
    throw serviceError;
  }
}

// ---------------------------------------------------------------------------
// Response transformers
// ---------------------------------------------------------------------------

/**
 * Transforms a single Nominatim search/reverse result into the stable
 * LocalSpot location format.
 *
 * Exported for unit testing. Internal callers use searchLocation() and
 * reverseGeocode() directly.
 *
 * @param {object} item - Raw Nominatim result object
 * @returns {object} - LocalSpot location shape
 */
export function transformNominatimResult(item) {
  if (!item) return null;

  const addr = item.address || {};

  return {
    displayName: item.display_name || null,
    latitude: item.lat !== undefined ? parseFloat(item.lat) : null,
    longitude: item.lon !== undefined ? parseFloat(item.lon) : null,
    address: {
      road: addr.road || addr.street || null,
      neighbourhood:
        addr.neighbourhood || addr.suburb || addr.quarter || null,
      city:
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        null,
      county: addr.county || null,
      state: addr.state || null,
      country: addr.country || null,
      countryCode: addr.country_code
        ? addr.country_code.toLowerCase()
        : null,
      postcode: addr.postcode || null,
    },
    osm: {
      type: item.osm_type || null,
      id: item.osm_id !== undefined ? String(item.osm_id) : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Service: forward geocoding
// ---------------------------------------------------------------------------

/**
 * Searches for a location by free-text query.
 * Returns an array of matching place results (may be empty).
 *
 * Example: searchLocation("GRA Port Harcourt", 5)
 *
 * @param {string} q     - Location query string
 * @param {number} limit - Max results to return (1–10, default 5)
 * @returns {Promise<Array>}
 */
export async function searchLocation(q, limit = 5) {
  const trimmed = q ? String(q).trim() : "";

  if (!trimmed) {
    return [];
  }

  const params = {
    q: trimmed,
    format: "jsonv2",
    addressdetails: 1,
    limit: Math.min(10, Math.max(1, Number(limit) || 5)),
  };

  // Restrict to configured country codes (default: Nigeria)
  if (COUNTRY_CODES) {
    params.countrycodes = COUNTRY_CODES;
  }

  const data = await nominatimFetch("/search", params);

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(transformNominatimResult).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Service: reverse geocoding
// ---------------------------------------------------------------------------

/**
 * Resolves geographic coordinates to a human-readable address.
 * Returns null when Nominatim finds no result for the given coordinates.
 *
 * @param {number} lat - Latitude  (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @returns {Promise<object|null>}
 */
export async function reverseGeocode(lat, lon) {
  const data = await nominatimFetch("/reverse", {
    lat,
    lon,
    format: "jsonv2",
    addressdetails: 1,
  });

  // Nominatim returns { error: "Unable to geocode" } when no result is found
  if (!data || data.error) {
    return null;
  }

  return transformNominatimResult(data);
}
