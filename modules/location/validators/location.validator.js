/**
 * Input validators for location/geocoding routes.
 * Follows the same written middleware pattern as the rest of the project.
 */

/**
 * GET /api/v1/location/search
 */
export function validateLocationSearch(req, res, next) {
    const { q, limit } = req.query;

    if (!q || typeof q !== "string" || !q.trim()) {
        return res.status(400).json({ message: "q is required" });
    }

    if (q.trim().length > 200) {
        return res
            .status(400)
            .json({ message: "q must be 200 characters or fewer" });
    }

    if (limit !== undefined) {
        const l = parseInt(limit, 10);
        if (isNaN(l) || l < 1 || l > 10) {
            return res
                .status(400)
                .json({ message: "limit must be between 1 and 10" });
        }
    }

    return next();
}

/**
 * GET /api/v1/location/reverse
 */
export function validateReverseGeocode(req, res, next) {
    const { lat, lon } = req.query;

    if (lat === undefined || lat === null || lat === "") {
        return res.status(400).json({ message: "lat is required" });
    }

    if (lon === undefined || lon === null || lon === "") {
        return res.status(400).json({ message: "lon is required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude)) {
        return res.status(400).json({ message: "lat must be a valid number" });
    }

    if (isNaN(longitude)) {
        return res.status(400).json({ message: "lon must be a valid number" });
    }

    if (latitude < -90 || latitude > 90) {
        return res
            .status(400)
            .json({ message: "lat must be between -90 and 90" });
    }

    if (longitude < -180 || longitude > 180) {
        return res
            .status(400)
            .json({ message: "lon must be between -180 and 180" });
    }

    return next();
}