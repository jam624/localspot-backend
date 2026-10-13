import { Router } from "express";

import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  registerUser,
  resetPassword,
  updateProfile,
} from "../controllers/userAuth.controller.js";
import { requireUserAuth } from "../../../middleware/userAuth.middleware.js";
import {
  validateForgotPassword,
  validateLogin,
  validateRegister,
  validateResetPassword,
  validateUpdateProfile,
} from "../validators/userAuth.validator.js";

const router = Router();

/**
 * @openapi
 * /auth/user/register:
 *   post:
 *     tags: [User Authentication]
 *     summary: Register a consumer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: securePassword123
 *     responses:
 *       201:
 *         description: Account created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Account created successfully }
 *                 token: { type: string, example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... }
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     name: { type: string, example: Jane Doe }
 *                     email: { type: string, example: jane@example.com }
 *                     status: { type: string, example: active }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Account with this email already exists.
 */
router.post("/register", validateRegister, registerUser);

/**
 * @openapi
 * /auth/user/login:
 *   post:
 *     tags: [User Authentication]
 *     summary: Sign in to a consumer account
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
 *                 example: jane@example.com
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
 *                 message: { type: string, example: Login successful }
 *                 token: { type: string }
 *                 user: { type: object }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid email or password.
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post("/login", validateLogin, login);

/**
 * @openapi
 * /auth/user/logout:
 *   post:
 *     tags: [User Authentication]
 *     summary: Sign out of the current consumer account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Logout successful.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/logout", requireUserAuth, logout);

/**
 * @openapi
 * /auth/user/me:
 *   get:
 *     tags: [User Authentication]
 *     summary: Get current authenticated consumer account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     name: { type: string, example: Jane Doe }
 *                     email: { type: string, example: jane@example.com }
 *                     status: { type: string, example: active }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/me", requireUserAuth, getCurrentUser);

/**
 * @openapi
 * /auth/user/me:
 *   patch:
 *     tags: [User Authentication]
 *     summary: Update profile or password for current authenticated consumer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch("/me", requireUserAuth, validateUpdateProfile, updateProfile);

/**
 * @openapi
 * /auth/user/forgot-password:
 *   post:
 *     tags: [User Authentication]
 *     summary: Request a password reset link
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
 *                 example: jane@example.com
 *     responses:
 *       200:
 *         description: Reset link sent if account exists.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/forgot-password", validateForgotPassword, forgotPassword);

/**
 * @openapi
 * /auth/user/reset-password:
 *   post:
 *     tags: [User Authentication]
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
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post("/reset-password", validateResetPassword, resetPassword);

export default router;
