// validation: featured listing request inputs

const VALID_PLACEMENTS = ["homepage_featured", "category_featured", "search_featured"];
const VALID_STATUSES = [
  "requested",
  "pending_approval",
  "approved",
  "rejected",
  "active",
  "expired",
  "disabled",
];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// validation: POST body for creating a featured listing request
export function validateCreateRequest(req, res, next) {
  const { placement, category_id, requested_start_date, requested_end_date } = req.body;

  if (placement !== undefined) {
    if (typeof placement !== "string" || !placement.trim()) {
      return res.status(400).json({ message: "placement must be a non-empty string" });
    }
    if (!VALID_PLACEMENTS.includes(placement)) {
      return res
        .status(400)
        .json({ message: `placement must be one of: ${VALID_PLACEMENTS.join(", ")}` });
    }
  }

  if (category_id !== undefined) {
    const parsed = Number(category_id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({ message: "category_id must be a positive integer" });
    }
  }

  // date fields are optional, but if one is supplied both must be supplied
  if (requested_start_date || requested_end_date) {
    if (!requested_start_date || !requested_end_date) {
      return res.status(400).json({
        message: "Both requested_start_date and requested_end_date are required together",
      });
    }

    if (!ISO_DATE_RE.test(requested_start_date) || !ISO_DATE_RE.test(requested_end_date)) {
      return res.status(400).json({ message: "Date fields must be in YYYY-MM-DD format" });
    }

    const start = new Date(requested_start_date);
    const end = new Date(requested_end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date value provided" });
    }

    if (start > end) {
      return res
        .status(400)
        .json({ message: "requested_start_date must be before requested_end_date" });
    }

    // reject past start dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({ message: "requested_start_date cannot be in the past" });
    }
  }

  return next();
}

// validation: admin reject body — rejection_reason is mandatory and must be meaningful
export function validateAdminReject(req, res, next) {
  const { rejection_reason } = req.body;

  if (!rejection_reason || typeof rejection_reason !== "string" || !rejection_reason.trim()) {
    return res.status(400).json({ message: "rejection_reason is required" });
  }

  if (rejection_reason.trim().length < 10) {
    return res
      .status(400)
      .json({ message: "rejection_reason must be at least 10 characters" });
  }

  return next();
}

// validation: list query params — page, limit, status
export function validateListQuery(req, res, next) {
  const { page, limit, status } = req.query;

  if (page !== undefined) {
    const p = Number(page);
    if (!Number.isInteger(p) || p < 1) {
      return res.status(400).json({ message: "page must be a positive integer" });
    }
  }

  if (limit !== undefined) {
    const l = Number(limit);
    if (!Number.isInteger(l) || l < 1 || l > 100) {
      return res.status(400).json({ message: "limit must be between 1 and 100" });
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ message: `status must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  return next();
}
