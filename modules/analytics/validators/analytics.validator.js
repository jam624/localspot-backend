// validation: query params for all analytics endpoints

const VALID_PERIODS = ["today", "7d", "30d"];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// validation: period or date range — rejects bad combos before hitting the DB
export function validateAnalyticsQuery(req, res, next) {
  const { period, startDate, endDate } = req.query;

  // no params is fine — service defaults to 30d
  if (!period && !startDate && !endDate) {
    return next();
  }

  // custom date range: both sides required
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Both startDate and endDate are required for a custom range" });
    }

    // format check: must be YYYY-MM-DD
    if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(endDate)) {
      return res
        .status(400)
        .json({ message: "startDate and endDate must be in YYYY-MM-DD format" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // real date check
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "startDate or endDate is not a valid date" });
    }

    // order check: start must come before end
    if (start > end) {
      return res.status(400).json({ message: "startDate must be before endDate" });
    }

    return next();
  }

  // named period check: today, 7d, or 30d only
  if (period && !VALID_PERIODS.includes(period)) {
    return res
      .status(400)
      .json({ message: `period must be one of: ${VALID_PERIODS.join(", ")}` });
  }

  return next();
}
