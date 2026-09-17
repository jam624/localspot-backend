import {
  forgotAdminPassword,
  loginAdmin,
  resetAdminPassword,
} from "../services/adminAuth.service.js";
import { publicAdminAccount } from "../../../utils/auth.js";

/**
 * POST /api/v1/auth/admin/login
 */
export async function login(req, res, next) {
  try {
    const result = await loginAdmin(req.body);

    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/admin/logout
 * Stateless JWT logout — instructs the client to discard the token.
 */
export function logout(req, res) {
  return res.status(200).json({ message: "Logged out successfully" });
}

/**
 * GET /api/v1/auth/admin/me
 */
export function getCurrentAdmin(req, res) {
  return res.status(200).json({
    account: publicAdminAccount(req.admin),
  });
}

/**
 * POST /api/v1/auth/admin/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    await forgotAdminPassword(req.body.email);

    // Always return 200 to prevent email enumeration
    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/admin/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    await resetAdminPassword(req.body.token, req.body.password);

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return next(error);
  }
}
