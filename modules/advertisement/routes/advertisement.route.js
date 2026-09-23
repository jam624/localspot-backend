// backend/routes/advertisementRoutes.js

import express from "express";
import * as ad from "../controllers/advertisementController.js";


// From modules/advertisements/routes/ we go up 3 levels.
import { requireBusinessAuth } from "../../../middleware/businessAuth.middleware.js";
import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";

const router = express.Router();

/* ==========================================================================
   PUBLIC ROUTES
   No auth required — used by clients/frontends to render the ad creation form.
   ========================================================================== */

// GET /api/advertisements/types
router.get("/types", ad.listAdvertisementTypes);

// GET /api/advertisements/slots
router.get("/slots", ad.listAdvertisementSlots);


/* ==========================================================================
   BUSINESS ROUTES
   Mounted at /api/advertisements/business
   Requires a valid business account session.
   ========================================================================== */

const businessRouter = express.Router();

businessRouter.use(requireBusinessAuth);

// Create a new advertisement (starts as 'draft')
// POST /api/advertisements/business
businessRouter.post("/", ad.createAdvertisement);

// List all advertisements owned by the logged-in business
// GET /api/advertisements/business
businessRouter.get("/", ad.listMyAdvertisements);

// Get a single advertisement (must belong to the logged-in business)
// GET /api/advertisements/business/:id
businessRouter.get("/:id", ad.getMyAdvertisement);

// Update an advertisement (only when status is 'draft' or 'rejected')
// PUT /api/advertisements/business/:id
businessRouter.put("/:id", ad.updateMyAdvertisement);

// Submit an advertisement for admin approval
// draft | rejected -> pending_approval
// POST /api/advertisements/business/:id/submit
businessRouter.post("/:id/submit", ad.submitMyAdvertisement);

// Pause a live advertisement
// active | scheduled | approved -> paused
// POST /api/advertisements/business/:id/pause
businessRouter.post("/:id/pause", ad.pauseMyAdvertisement);

// Resume a paused advertisement
// paused -> active | scheduled
// POST /api/advertisements/business/:id/resume
businessRouter.post("/:id/resume", ad.resumeMyAdvertisement);

// Get impressions/clicks/CTR for an advertisement
// GET /api/advertisements/business/:id/performance?from=&to=
businessRouter.get("/:id/performance", ad.getMyAdvertisementPerformance);

// Delete an advertisement (only when status is 'draft' or 'rejected')
// DELETE /api/advertisements/business/:id
businessRouter.delete("/:id", ad.deleteMyAdvertisement);

router.use("/business", businessRouter);


/* ==========================================================================
   ADMIN ROUTES
   Mounted at /api/advertisements/admin
   Requires a valid admin session.
   ========================================================================== */

const adminRouter = express.Router();

adminRouter.use(requireAdminAuth);

// ---------------------------------------------------------------------
// Dashboard / stats
// ---------------------------------------------------------------------

// GET /api/advertisements/admin/stats?from=
adminRouter.get("/stats", ad.adminAdvertisementStats);

// ---------------------------------------------------------------------
// Advertisement types management
// ---------------------------------------------------------------------

// GET /api/advertisements/admin/types
adminRouter.get("/types", ad.adminListAdvertisementTypes);

// POST /api/advertisements/admin/types
adminRouter.post("/types", ad.adminCreateAdvertisementType);

// PUT /api/advertisements/admin/types/:id
adminRouter.put("/types/:id", ad.adminUpdateAdvertisementType);

// ---------------------------------------------------------------------
// Advertisement slots management
// ---------------------------------------------------------------------

// GET /api/advertisements/admin/slots
adminRouter.get("/slots", ad.adminListAdvertisementSlots);

// POST /api/advertisements/admin/slots
adminRouter.post("/slots", ad.adminCreateAdvertisementSlot);

// PUT /api/advertisements/admin/slots/:id
adminRouter.put("/slots/:id", ad.adminUpdateAdvertisementSlot);

// ---------------------------------------------------------------------
// Advertisements management
// ---------------------------------------------------------------------

// List advertisements with filters + pagination
// GET /api/advertisements/admin?status=&business_id=&slot_id=&type_id=&search=&from=&to=&limit=&offset=
adminRouter.get("/", ad.adminListAdvertisements);

// Get a single advertisement (with full admin metadata)
// GET /api/advertisements/admin/:id
adminRouter.get("/:id", ad.adminGetAdvertisement);

// Approve a pending advertisement (enforces slot capacity)
// POST /api/advertisements/admin/:id/approve
adminRouter.post("/:id/approve", ad.adminApproveAdvertisement);

// Reject an advertisement with a reason
// body: { reason }
// POST /api/advertisements/admin/:id/reject
adminRouter.post("/:id/reject", ad.adminRejectAdvertisement);

// Manually force a status change
// body: { status }
// PATCH /api/advertisements/admin/:id/status
adminRouter.patch("/:id/status", ad.adminSetAdvertisementStatus);

// Delete an advertisement
// DELETE /api/advertisements/admin/:id
adminRouter.delete("/:id", ad.adminDeleteAdvertisement);

router.use("/admin", adminRouter);


export default router;