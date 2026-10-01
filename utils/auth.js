import crypto from "crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";

const scrypt = promisify(crypto.scrypt);

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 })).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, storedHash] = String(passwordHash || "").split(":");

  if (algorithm !== "scrypt" || !salt || !storedHash) {
    return false;
  }

  const storedBuffer = Buffer.from(storedHash, "hex");
  const passwordBuffer = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });

  return (
    storedBuffer.length === passwordBuffer.length &&
    crypto.timingSafeEqual(storedBuffer, passwordBuffer)
  );
}

// ---------------------------------------------------------------------------
// Password reset token helpers
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically secure password reset token.
 * Returns both the raw token (to include in the reset URL) and
 * the hashed value (to store in the database).
 *
 * @returns {{ rawToken: string, tokenHash: string }}
 */
export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

// ---------------------------------------------------------------------------
// JWT helpers — Business
// ---------------------------------------------------------------------------

export function createBusinessToken(account) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub: String(account.id),
      type: "business",
      email: account.email,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured in production");
  }
  return "localspot-dev-secret";
}

/**
 * Returns a safe, public-facing representation of a business account row.
 */
export function publicBusinessAccount(account) {
  return {
    id: account.id,
    businessName: account.business_name,
    ownerName: account.owner_name,
    email: account.email,
    phone: account.phone,
    status: account.status,
    emailVerifiedAt: account.email_verified_at,
    lastLoginAt: account.last_login_at,
    createdAt: account.created_at,
  };
}

// ---------------------------------------------------------------------------
// JWT helpers — Admin
// ---------------------------------------------------------------------------

export function createAdminToken(admin) {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      sub: String(admin.id),
      type: "admin",
      email: admin.email,
      role: admin.role,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
}

/**
 * Returns a safe, public-facing representation of an admin row.
 */
export function publicAdminAccount(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isActive: Boolean(admin.is_active),
    lastLoginAt: admin.last_login_at,
    createdAt: admin.created_at,
  };
}
