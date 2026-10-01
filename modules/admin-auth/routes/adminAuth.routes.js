import { Router } from "express";

import {
  forgotPassword,
  getCurrentAdmin,
  login,
  logout,
  resetPassword,
} from "../controllers/adminAuth.controller.js";
import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";
import {
  validateForgotPassword,
  validateLogin,
  validateResetPassword,
} from "../validators/adminAuth.validator.js";

const router = Router();

/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     tags: [Admin Authentication]
 *     summary: Sign in as an administrator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@localspot.ng
 *               password:
 *                 type: string
 *                 format: password
 *                 example: adminPassword123
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     name: { type: string, example: Super Admin }
 *                     email: { type: string, example: admin@localspot.ng }
 *                     role: { type: string, example: super_admin }
 *                     isActive: { type: boolean, example: true }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post("/login", validateLogin, login);

/**
 * @openapi
 * /auth/admin/logout:
 *   post:
 *     tags: [Admin Authentication]
 *     summary: Sign out of the admin session
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/logout", requireAdminAuth, logout);

/**
 * @openapi
 * /auth/admin/me:
 *   get:
 *     tags: [Admin Authentication]
 *     summary: Get current authenticated administrator profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current administrator account details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     name: { type: string, example: Super Admin }
 *                     email: { type: string, example: admin@localspot.ng }
 *                     role: { type: string, example: super_admin }
 *                     isActive: { type: boolean, example: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", requireAdminAuth, getCurrentAdmin);

/**
 * @openapi
 * /auth/admin/forgot-password:
 *   post:
 *     tags: [Admin Authentication]
 *     summary: Request admin password reset link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@localspot.ng
 *     responses:
 *       200:
 *         description: Reset link sent if account exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: If an account with that email exists, a password reset link has been sent.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/forgot-password", validateForgotPassword, forgotPassword);

/**
 * @openapi
 * /auth/admin/reset-password:
 *   post:
 *     tags: [Admin Authentication]
 *     summary: Reset admin password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "4f7c2b3e8a1d..."
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: newSecurePassword123
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/reset-password", validateResetPassword, resetPassword);

export default router;
