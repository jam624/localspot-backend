import pool from "../config/db.js";
import { businessAccountStatements } from "../config/statement.js";
import { verifyToken } from "../utils/auth.js";

export async function requireBusinessAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Authentication token required" });
  let payload;
  try { payload = verifyToken(token); }
  catch { return res.status(401).json({ message: "Invalid or expired token" }); }
  if (payload.type !== "business") return res.status(403).json({ message: "Invalid account type" });
  try {
    const [rows] = await pool.execute(businessAccountStatements.findById, [payload.sub]);
    if (!rows.length) return res.status(401).json({ message: "Account not found" });
    if (rows[0].status !== "active") return res.status(403).json({ message: "Business account is inactive" });
    req.businessAccount = rows[0];
    req.user = { id: rows[0].id, role: "business", type: "business" };
    return next();
  } catch (error) {
    return next(error);
  }
}
