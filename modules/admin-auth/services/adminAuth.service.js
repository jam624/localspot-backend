import pool from "../../../config/db.js";
import {
  adminStatements,
  passwordResetStatements,
} from "../../../config/statement.js";
import {
  createAdminToken,
  generateResetToken,
  hashPassword,
  normalizeEmail,
  publicAdminAccount,
  verifyPassword,
} from "../../../utils/auth.js";
import { badRequest, forbidden, unauthorized } from "../../../utils/errors.js";
import { passwordResetEmail } from "../../../utils/emailtemplates.js";
import { sendMail } from "../../../utils/mailer.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getResetUrl(rawToken) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base}/admin/reset-password?token=${rawToken}`;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function loginAdmin(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  const [rows] = await pool.execute(adminStatements.findByEmail, [email]);

  if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) {
    throw unauthorized("Invalid email or password");
  }

  if (!rows[0].is_active) {
    throw forbidden("This admin account is inactive");
  }

  await pool.execute(adminStatements.updateLastLogin, [rows[0].id]);

  const [updatedRows] = await pool.execute(adminStatements.findById, [
    rows[0].id,
  ]);
  const admin = updatedRows[0];

  return {
    token: createAdminToken(admin),
    account: publicAdminAccount(admin),
  };
}

/**
 * Generates a password reset token and emails the reset link.
 * Always resolves without error to prevent email enumeration.
 */
export async function forgotAdminPassword(email) {
  const normalised = normalizeEmail(email);

  const [rows] = await pool.execute(adminStatements.findByEmail, [normalised]);

  // Silently return — do not reveal whether the email exists
  if (!rows.length || !rows[0].is_active) {
    return;
  }

  const admin = rows[0];
  const { rawToken, tokenHash } = generateResetToken();

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.execute(passwordResetStatements.create, [
    "admin",
    null,
    admin.id,
    tokenHash,
    expiresAt,
  ]);

  const resetUrl = getResetUrl(rawToken);
  const message = passwordResetEmail({ resetUrl, name: admin.name });

  sendMail({ to: normalised, ...message }).catch((err) => {
    console.error("Failed to send admin password reset email:", err.message);
  });
}

/**
 * Validates the reset token and updates the admin's password.
 */
export async function resetAdminPassword(rawToken, newPassword) {
  const crypto = await import("crypto");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const [tokenRows] = await pool.execute(
    passwordResetStatements.findByTokenHash,
    [tokenHash]
  );

  if (!tokenRows.length || tokenRows[0].account_type !== "admin") {
    throw badRequest("Invalid or expired reset token");
  }

  const tokenRecord = tokenRows[0];

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(adminStatements.updatePassword, [
      await hashPassword(newPassword),
      tokenRecord.admin_id,
    ]);

    await connection.execute(passwordResetStatements.markUsed, [tokenRecord.id]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
