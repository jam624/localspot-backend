import {
  createBusinessAccount,
  forgotBusinessPassword,
  loginBusinessAccount,
  resetBusinessPassword,
} from "../services/businessAuth.service.js";
import { publicBusinessAccount } from "../../../utils/auth.js";

/**
 * POST /api/v1/auth/business/register
 */
export async function registerBusinessAccount(req, res, next) {
  try {
    const result = await createBusinessAccount(req.body);

    return res.status(201).json({
      message: "Business account created successfully",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/business/login
 */
export async function loginBusiness(req, res, next) {
  try {
    const result = await loginBusinessAccount(req.body);

    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/business/logout
 * Stateless JWT logout — instructs the client to discard the token.
 */
export function logoutBusiness(req, res) {
  return res.status(200).json({ message: "Logged out successfully" });
}

/**
 * GET /api/v1/auth/business/me
 */
export function getCurrentBusinessAccount(req, res) {
  return res.status(200).json({
    account: publicBusinessAccount(req.businessAccount),
  });
}

/**
 * POST /api/v1/auth/business/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    await forgotBusinessPassword(req.body.email);

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
 * POST /api/v1/auth/business/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    await resetBusinessPassword(req.body.token, req.body.password);

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return next(error);
  }
}
