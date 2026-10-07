import { Router } from "express";
import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";
import {
  getAdminDashboard,
  getRevenueSummary,
  listRevenueTransactions,
  getRevenueTransaction,
} from "../adminCore.service.js";

const router = Router();
router.use(requireAdminAuth);

function wrap(fn) {
  return async (req, res, next) => {
    try { return res.status(200).json(await fn(req)); }
    catch (e) { return next(e); }
  };
}

// GET /api/v1/admin/dashboard
router.get("/dashboard", wrap(() => getAdminDashboard()));

// GET /api/v1/admin/revenue/summary  (must be before /:id)
router.get("/revenue/summary", wrap(() => getRevenueSummary()));

// GET /api/v1/admin/revenue/transactions
router.get("/revenue/transactions", wrap((req) => listRevenueTransactions(req.query)));

// GET /api/v1/admin/revenue  (overview = same as summary)
router.get("/revenue", wrap(() => getRevenueSummary()));

// GET /api/v1/admin/revenue/:id
router.get("/revenue/:id", wrap((req) => getRevenueTransaction(req.params.id)));

export default router;
