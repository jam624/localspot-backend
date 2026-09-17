import pool from "../config/db.js";
import { businessAccountStatements } from "../config/statement.js";
import { verifyToken } from "../utils/auth.js";

export async function requireBusinessAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication token required" });
    }

    const payload = verifyToken(token);

    if (payload.type !== "business") {
      return res.status(403).json({ message: "Invalid account type" });
    }

    const [rows] = await pool.execute(businessAccountStatements.findById, [
      payload.sub,
    ]);

    if (!rows.length) {
      return res.status(401).json({ message: "Account not found" });
    }

    req.businessAccount = rows[0];
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
