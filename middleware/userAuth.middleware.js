import pool from "../config/db.js";
import { userStatements } from "../config/statement.js";
import { verifyToken } from "../utils/auth.js";

/**
 * requireUserAuth — protects consumer-facing routes.
 * Mirrors the structure of businessAuth.middleware.js and adminAuth.middleware.js.
 * Sets req.user = { id, role: 'user', type: 'user' } on success.
 */
export async function requireUserAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Authentication token required" });

  let payload;
  try { payload = verifyToken(token); }
  catch { return res.status(401).json({ message: "Invalid or expired token" }); }

  if (payload.type !== "user") return res.status(403).json({ message: "Invalid account type" });

  try {
    const [rows] = await pool.execute(userStatements.findById, [payload.sub]);
    if (!rows.length) return res.status(401).json({ message: "Account not found" });
    if (rows[0].status !== "active") return res.status(403).json({ message: "User account is inactive" });
    req.currentUser = rows[0];
    req.user = { id: rows[0].id, role: "user", type: "user" };
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * optionalUserAuth — enriches the request with user context if a valid token
 * is present, but does NOT reject unauthenticated requests.
 * Useful for public endpoints that behave differently for logged-in users
 * (e.g. returning isFavorited: true on business detail pages).
 */
export async function optionalUserAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    if (payload.type !== "user") return next();

    const [rows] = await pool.execute(userStatements.findById, [payload.sub]);
    if (rows.length && rows[0].status === "active") {
      req.currentUser = rows[0];
      req.user = { id: rows[0].id, role: "user", type: "user" };
    }
  } catch {
    // silently ignore invalid tokens on optional routes
  }
  return next();
}
