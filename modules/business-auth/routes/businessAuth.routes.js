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

router.post("/register", validateRegister, registerBusinessAccount);
router.post("/login", validateLogin, loginBusiness);
router.post("/logout", requireBusinessAuth, logoutBusiness);
router.get("/me", requireBusinessAuth, getCurrentBusinessAccount);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);

export default router;
