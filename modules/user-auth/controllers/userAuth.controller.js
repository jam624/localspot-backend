import {
  createUserAccount,
  forgotUserPassword,
  loginUser,
  resetUserPassword,
  updateUserProfile,
} from "../services/userAuth.service.js";
import { publicUser } from "../../../utils/auth.js";

/**
 * POST /api/v1/auth/user/register
 */
export async function registerUser(req, res, next) {
  try {
    const result = await createUserAccount(req.body);
    return res.status(201).json({
      message: "Account created successfully",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/user/login
 */
export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body);
    return res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/user/logout
 * Stateless JWT logout — instructs the client to discard the token.
 */
export function logout(req, res) {
  return res.status(200).json({ message: "Logged out successfully" });
}

/**
 * GET /api/v1/auth/user/me
 */
export function getCurrentUser(req, res) {
  return res.status(200).json({
    user: publicUser(req.currentUser),
  });
}

/**
 * PATCH /api/v1/auth/user/me
 */
export async function updateProfile(req, res, next) {
  try {
    const result = await updateUserProfile(req.user.id, req.body);
    return res.status(200).json({
      message: "Profile updated successfully",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/user/forgot-password
 */
export async function forgotPassword(req, res, next) {
  try {
    await forgotUserPassword(req.body.email);
    return res.status(200).json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/v1/auth/user/reset-password
 */
export async function resetPassword(req, res, next) {
  try {
    await resetUserPassword(req.body.token, req.body.password);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    return next(error);
  }
}
