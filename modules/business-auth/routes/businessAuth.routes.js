import { Router } from "express";

import {
  forgotPassword,
  getCurrentBusinessAccount,
  loginBusiness,
  logoutBusiness,
  registerBusinessAccount,
  resetPassword,
} from "../controllers/businessAuth.controller.js";
import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import {
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
} from "../validators/businessAuth.validator.js";

const router = Router();

/**
 * @openapi
 * /auth/business/register:
 *   post:
 *     tags: [Business Authentication]
 *     summary: Register a business account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ownerName, email, phone, password]
 *             properties:
 *               ownerName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: owner@example.com
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: securePassword123
 *               businessName:
 *                 type: string
 *                 example: John's Cafe
 *     responses:
 *       201:
 *         description: Business account registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Business account created successfully
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     businessName: { type: string, example: John's Cafe }
 *                     ownerName: { type: string, example: John Doe }
 *                     email: { type: string, example: owner@example.com }
 *                     phone: { type: string, example: "+2348012345678" }
 *                     status: { type: string, example: active }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Account with this email or phone already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", validateRegister, registerBusinessAccount);

/**
 * @openapi
 * /auth/business/login:
 *   post:
 *     tags: [Business Authentication]
 *     summary: Sign in to a business account
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
 *                 example: owner@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: securePassword123
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
 *                     businessName: { type: string, example: John's Cafe }
 *                     ownerName: { type: string, example: John Doe }
 *                     email: { type: string, example: owner@example.com }
 *                     phone: { type: string, example: "+2348012345678" }
 *                     status: { type: string, example: active }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid email or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post("/login", validateLogin, loginBusiness);

/**
 * @openapi
 * /auth/business/logout:
 *   post:
 *     tags: [Business Authentication]
 *     summary: Sign out of the current business account
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
router.post("/logout", requireBusinessAuth, logoutBusiness);

/**
 * @openapi
 * /auth/business/me:
 *   get:
 *     tags: [Business Authentication]
 *     summary: Get current authenticated business account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current business account details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     businessName: { type: string, example: John's Cafe }
 *                     ownerName: { type: string, example: John Doe }
 *                     email: { type: string, example: owner@example.com }
 *                     phone: { type: string, example: "+2348012345678" }
 *                     status: { type: string, example: active }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", requireBusinessAuth, getCurrentBusinessAccount);

/**
 * @openapi
 * /auth/business/forgot-password:
 *   post:
 *     tags: [Business Authentication]
 *     summary: Request password reset link
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
 *                 example: owner@example.com
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
 * /auth/business/reset-password:
 *   post:
 *     tags: [Business Authentication]
 *     summary: Reset password using reset token
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
 *                 example: newPassword456
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
