import { Router } from "express";
import { requireAdminAuth } from "../../../middleware/adminAuth.middleware.js";
import {
  adminList, adminCreate, adminGet, adminUpdate, adminDelete,
  adminEnable, adminDisable,
} from "../categories.controller.js";

const router = Router();
router.use(requireAdminAuth);

router.get("/", adminList);
router.post("/", adminCreate);
router.get("/:id", adminGet);
router.put("/:id", adminUpdate);
router.delete("/:id", adminDelete);
router.post("/:id/enable", adminEnable);
router.post("/:id/disable", adminDisable);

export default router;
