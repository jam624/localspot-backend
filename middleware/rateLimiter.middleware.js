import rateLimit from "express-rate-limit";

/**
 * General API rate limiter for standard endpoints.
 * Limits each IP to 200 requests per 15-minute window.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

/**
 * Stricter rate limiter for authentication routes (/login, /register, /forgot-password, /reset-password).
 * Protects against brute-force and credential stuffing attacks.
 * Limits each IP to 15 requests per 15-minute window.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts, please try again after 15 minutes.",
  },
});
