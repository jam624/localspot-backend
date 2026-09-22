import pool from "../config/db.js";
import { adminStatements } from "../config/statement.js";
import { verifyToken } from "../utils/auth.js";

const DEFAULT_ADMIN_ROLES = ["super_admin", "admin", "moderator"];

function verifyAdminWithRoles(allowedRoles) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (!token) {
        return res
          .status(401)
          .json({ message: "Authentication token required" });
      }

      const payload = verifyToken(token);

      if (payload.type !== "admin") {
        return res.status(403).json({ message: "Invalid account type" });
      }

      const [rows] = await pool.execute(adminStatements.findById, [
        payload.sub,
      ]);

      if (!rows.length) {
        return res.status(401).json({ message: "Admin account not found" });
      }

      const admin = rows[0];

      if (!admin.is_active) {
        return res.status(403).json({ message: "Admin account is inactive" });
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(admin.role)) {
        return res.status(403).json({
          message: "Insufficient permissions for this resource",
        });
      }

      req.admin = admin;
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}

/**
 * Middleware to require admin authentication.
 * Can be used directly: `router.get("/me", requireAdminAuth, handler)`
 * Or parameterized by role: `router.delete("/business/:id", requireAdminAuth(["super_admin"]), handler)`
 */
export function requireAdminAuth(rolesOrReq = DEFAULT_ADMIN_ROLES, res, next) {
  // Direct middleware usage: requireAdminAuth(req, res, next)
  if (rolesOrReq && rolesOrReq.headers && typeof next === "function") {
    return verifyAdminWithRoles(DEFAULT_ADMIN_ROLES)(rolesOrReq, res, next);
  }

  const allowedRoles = Array.isArray(rolesOrReq) ? rolesOrReq : [rolesOrReq];
  return verifyAdminWithRoles(allowedRoles);
}
