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

router.post("/login", validateLogin, login);
router.post("/logout", requireAdminAuth, logout);
router.get("/me", requireAdminAuth, getCurrentAdmin);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);

export default router;
