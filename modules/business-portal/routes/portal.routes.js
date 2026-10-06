/**
 * Business Portal Routes
 * Mounted at /api/v1/business in app.js
 * All routes require business authentication.
 */

import { Router } from "express";
import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import {
  dashboard,
  getProfileCtrl, updateProfileCtrl, updateContactCtrl, updateLocationCtrl,
  updateHoursCtrl, updateServicesCtrl, updateAmenitiesCtrl,
  listMediaCtrl, addMediaCtrl, updateMediaCtrl, deleteMediaCtrl,
  submitCtrl, statusCtrl, resubmitCtrl,
} from "../portal.controller.js";

const router = Router();
router.use(requireBusinessAuth);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard", dashboard);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/profile", getProfileCtrl);
router.put("/profile", updateProfileCtrl);
router.patch("/profile/contact", updateContactCtrl);
router.patch("/profile/location", updateLocationCtrl);
router.put("/profile/hours", updateHoursCtrl);
router.put("/profile/services", updateServicesCtrl);
router.put("/profile/amenities", updateAmenitiesCtrl);

// ── Media ─────────────────────────────────────────────────────────────────────
router.get("/media", listMediaCtrl);
router.post("/media", addMediaCtrl);
router.patch("/media/:mediaId", updateMediaCtrl);
router.delete("/media/:mediaId", deleteMediaCtrl);

// ── Listing lifecycle ─────────────────────────────────────────────────────────
router.post("/listing/submit", submitCtrl);
router.get("/listing/status", statusCtrl);
router.post("/listing/resubmit", resubmitCtrl);

export default router;
