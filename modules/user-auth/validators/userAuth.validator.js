/**
 * User Auth Validator
 * Hand-written middleware validators — identical pattern to businessAuth.validator.js.
 */

/**
 * POST /register
 */
export function validateRegister(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ message: "email is required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ message: "email is not valid" });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "password is required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "password must be at least 8 characters" });
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
    return res.status(400).json({ message: "password must be at least 8 characters" });
  }

  return next();
}

/**
 * PATCH /me
 */
export function validateUpdateProfile(req, res, next) {
  const { name, currentPassword, newPassword } = req.body;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({ message: "name cannot be empty" });
  }

  if (newPassword !== undefined) {
    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ message: "currentPassword is required to change password" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({ message: "newPassword must be at least 8 characters" });
    }
  }

  if (name === undefined && newPassword === undefined) {
    return res.status(400).json({ message: "No update fields provided" });
  }

  return next();
}
