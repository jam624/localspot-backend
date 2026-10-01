const validDate = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));

function validate(req, res, next, { partial = false } = {}) {
  const data = req.body || {};
  const issues = [];
  const allowed = new Set([
    "title",
    "description",
    "imageUrl",
    "discountLabel",
    "startDate",
    "endDate",
  ]);

  if (Object.keys(data).some((key) => !allowed.has(key))) {
    issues.push("Unknown request field");
  }
  if (
    (!partial || data.title !== undefined) &&
    (typeof data.title !== "string" ||
      data.title.trim().length < 2 ||
      data.title.trim().length > 180)
  ) {
    issues.push("title must be 2 to 180 characters");
  }
  if (
    (!partial || data.description !== undefined) &&
    data.description !== undefined &&
    (typeof data.description !== "string" || data.description.trim().length > 5000)
  ) {
    issues.push("description must be a string under 5000 characters");
  }
  if (!partial && !data.description) issues.push("description is required");
  if ((!partial || data.startDate !== undefined) && !validDate(data.startDate)) {
    issues.push("startDate must be a valid date");
  }
  if ((!partial || data.endDate !== undefined) && !validDate(data.endDate)) {
    issues.push("endDate must be a valid date");
  }
  if (
    data.startDate &&
    data.endDate &&
    Date.parse(data.endDate) <= Date.parse(data.startDate)
  ) {
    issues.push("endDate must be after startDate");
  }
  if (
    data.imageUrl !== undefined &&
    data.imageUrl !== null &&
    (typeof data.imageUrl !== "string" ||
      data.imageUrl.length > 500 ||
      !/^https?:\/\//i.test(data.imageUrl))
  ) {
    issues.push("imageUrl must be a valid http(s) URL");
  }
  if (
    data.discountLabel !== undefined &&
    (typeof data.discountLabel !== "string" || data.discountLabel.length > 80)
  ) {
    issues.push("discountLabel must be under 80 characters");
  }
  if (partial && Object.keys(data).length === 0) {
    issues.push("Provide at least one field to update");
  }
  if (issues.length) {
    return res.status(400).json({ message: "Validation failed", errors: issues });
  }

  return next();
}

export const validateCreate = (req, res, next) => validate(req, res, next);
export const validateUpdate = (req, res, next) => validate(req, res, next, { partial: true });

export function validateId(req, res, next) {
  if (!/^[1-9]\d{0,17}$/.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid promotion id" });
  }

  return next();
}

export function validateReject(req, res, next) {
  if (typeof req.body?.reason !== "string" || req.body.reason.trim().length < 3) {
    return res.status(400).json({ message: "A rejection reason is required" });
  }

  return next();
}
