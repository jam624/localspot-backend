import pool from "../config/db.js";
import { adminStatements } from "../config/statement.js";
import { verifyToken } from "../utils/auth.js";

export async function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Authentication token required" });
  }

  let payload;
  try { payload = verifyToken(token); }
  catch { return res.status(401).json({ message: "Invalid or expired token" }); }
  if (payload.type !== "admin") return res.status(403).json({ message: "Invalid account type" });
  try {
    const [rows] = await pool.execute(adminStatements.findById, [payload.sub]);
    if (!rows.length || !rows[0].is_active) return res.status(401).json({ message: "Admin account is inactive or unavailable" });
    req.admin = rows[0];
    req.user = { id: rows[0].id, role: "admin", type: "admin" };
    return next();
  } catch (error) {
    return next(error);
  }
}
