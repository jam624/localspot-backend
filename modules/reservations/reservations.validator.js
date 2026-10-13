const RESERVATION_STATUSES = ["confirmed", "rejected", "completed"];

export function validateCreateReservation(req, res, next) {
  const { businessId, serviceId, reservationAt, partySize = 1, notes } = req.body;

  if (!Number.isInteger(Number(businessId)) || Number(businessId) <= 0) {
    return res.status(400).json({ message: "businessId must be a positive integer" });
  }
  if (serviceId !== undefined && serviceId !== null &&
      (!Number.isInteger(Number(serviceId)) || Number(serviceId) <= 0)) {
    return res.status(400).json({ message: "serviceId must be a positive integer" });
  }
  if (typeof reservationAt !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(reservationAt)) {
    return res.status(400).json({ message: "reservationAt must be an ISO timestamp with a timezone" });
  }
  const timestamp = Date.parse(reservationAt);
  if (!Number.isFinite(timestamp) || timestamp <= Date.now()) {
    return res.status(400).json({ message: "reservationAt must be a valid future date" });
  }
  if (!Number.isInteger(Number(partySize)) || Number(partySize) < 1 || Number(partySize) > 30) {
    return res.status(400).json({ message: "partySize must be an integer between 1 and 30" });
  }
  if (notes !== undefined && (typeof notes !== "string" || notes.length > 1000)) {
    return res.status(400).json({ message: "notes must be a string of at most 1000 characters" });
  }

  req.valid = {
    ...(req.valid || {}),
    body: {
      businessId: Number(businessId),
      serviceId: serviceId == null ? null : Number(serviceId),
      reservationAt: new Date(timestamp).toISOString().slice(0, 19).replace("T", " "),
      partySize: Number(partySize),
      notes: notes?.trim() || null,
    },
  };
  return next();
}

export function validateReservationId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "id must be a positive integer" });
  }
  req.params.id = id;
  return next();
}

export function validateReservationStatus(req, res, next) {
  const { status } = req.body;
  if (!RESERVATION_STATUSES.includes(status)) {
    return res.status(400).json({
      message: `status must be one of: ${RESERVATION_STATUSES.join(", ")}`,
    });
  }
  return next();
}

export function validateReservationListQuery(req, res, next) {
  const allowed = ["pending", "confirmed", "rejected", "cancelled", "completed"];
  if (req.query.status && !allowed.includes(req.query.status)) {
    return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
  }
  return next();
}
