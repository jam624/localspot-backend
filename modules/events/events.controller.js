import { trackEvent } from "./events.service.js";

export async function recordEvent(req, res, next) {
  try {
    const result = await trackEvent(req.body, req);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}
