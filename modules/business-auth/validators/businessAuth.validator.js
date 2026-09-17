/**
 * Input validators for business auth routes.
 * Each export is an Express middleware that validates req.body and calls
 * next() on success, or returns 400 on the first validation failure.
 */

/**
 * POST /register
 */
export function validateRegister(req, res, next) {
  const { ownerName, email, phone, password } = req.body;

  if (!ownerName || typeof ownerName !== "string" || !ownerName.trim()) {
    return res.status(400).json({ message: "ownerName is required" });
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "email is not valid" });
  }

  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return res.status(400).json({ message: "phone is required" });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "password is required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "password must be at least 8 characters" });
  }

  return next();
}

/**
 * POST /login
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "email is required" });
  }

  if (!password || typeof password !== "string" || !password) {
    return res.status(400).json({ message: "password is required" });
  }

  return next();
}

/**
 * POST /forgot-password
 */
export function validateForgotPassword(req, res, next) {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "email is required" });
  }

  return next();
}

/**
 * POST /reset-password
 */
export function validateResetPassword(req, res, next) {
  const { token, password } = req.body;

  if (!token || typeof token !== "string" || !token.trim()) {
    return res.status(400).json({ message: "token is required" });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "password is required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "password must be at least 8 characters" });
  }

  return next();
}
