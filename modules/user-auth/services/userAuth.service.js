import pool from "../../../config/db.js";
import {
  passwordResetStatements,
  userStatements,
} from "../../../config/statement.js";
import {
  createUserToken,
  generateResetToken,
  hashPassword,
  normalizeEmail,
  publicUser,
  verifyPassword,
} from "../../../utils/auth.js";
import { badRequest, conflict, forbidden, unauthorized } from "../../../utils/errors.js";
import { passwordResetEmail, userWelcomeEmail } from "../../../utils/emailtemplates.js";
import { sendMail } from "../../../utils/mailer.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getResetUrl(rawToken) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base}/reset-password?token=${rawToken}`;
}

async function sendWelcomeEmail({ to, name }) {
  const message = userWelcomeEmail({ name });
  await sendMail({ to, ...message });
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Register a new consumer account.
 * @param {{ name: string, email: string, password: string }} payload
 */
export async function createUserAccount(payload) {
  const name = String(payload.name || "").trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  // Check for existing account
  const [existingRows] = await pool.execute(userStatements.findByEmail, [email]);
  if (existingRows.length) {
    throw conflict("An account with this email already exists");
  }

  const [result] = await pool.execute(userStatements.create, [
    name,
    email,
    await hashPassword(password),
  ]);

  const userId = result.insertId;
  const [createdRows] = await pool.execute(userStatements.findById, [userId]);
  const user = createdRows[0];

  sendWelcomeEmail({ to: email, name }).catch((err) => {
    console.error("Failed to send user welcome email:", err.message);
  });

  return {
    token: createUserToken(user),
    user: publicUser(user),
  };
}

/**
 * Authenticate a consumer user.
 * @param {{ email: string, password: string }} payload
 */
export async function loginUser(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  const [rows] = await pool.execute(userStatements.findByEmail, [email]);

  if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) {
    throw unauthorized("Invalid email or password");
  }

  if (rows[0].status !== "active") {
    throw forbidden("This account is not active");
  }

  await pool.execute(userStatements.updateLastLogin, [rows[0].id]);

  const [updatedRows] = await pool.execute(userStatements.findById, [rows[0].id]);
  const user = updatedRows[0];

  return {
    token: createUserToken(user),
    user: publicUser(user),
  };
}

/**
 * Generates a password reset token and emails the link.
 * Always resolves without error to prevent email enumeration.
 * @param {string} email
 */
export async function forgotUserPassword(email) {
  const normalised = normalizeEmail(email);
  const [rows] = await pool.execute(userStatements.findByEmail, [normalised]);

  if (!rows.length || rows[0].status !== "active") return;

  const user = rows[0];
  const { rawToken, tokenHash } = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.execute(passwordResetStatements.create, [
    "user",
    null,           // business_account_id
    null,           // admin_id
    user.id,        // user_id
    tokenHash,
    expiresAt,
  ]);

  const resetUrl = getResetUrl(rawToken);
  const message = passwordResetEmail({ resetUrl, name: user.name });

  sendMail({ to: normalised, ...message }).catch((err) => {
    console.error("Failed to send password reset email:", err.message);
  });
}

/**
 * Validates the reset token and updates the user's password.
 * @param {string} rawToken
 * @param {string} newPassword
 */
export async function resetUserPassword(rawToken, newPassword) {
  const crypto = await import("crypto");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const [tokenRows] = await pool.execute(
    passwordResetStatements.findByTokenHash,
    [tokenHash]
  );

  if (!tokenRows.length || tokenRows[0].account_type !== "user") {
    throw badRequest("Invalid or expired reset token");
  }

  const tokenRecord = tokenRows[0];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(userStatements.updatePassword, [
      await hashPassword(newPassword),
      tokenRecord.user_id,
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

/**
 * Update profile for consumer account.
 * Supports updating name and/or updating password.
 * @param {number} userId
 * @param {{ name?: string, currentPassword?: string, newPassword?: string }} payload
 */
export async function updateUserProfile(userId, payload) {
  const [rows] = await pool.execute(userStatements.findById, [userId]);
  if (!rows.length || rows[0].status !== "active") {
    throw forbidden("Account not found or inactive");
  }
  const user = rows[0];

  if (payload.newPassword) {
    const [fullUser] = await pool.execute(userStatements.findByEmail, [user.email]);
    if (!fullUser.length || !(await verifyPassword(payload.currentPassword, fullUser[0].password_hash))) {
      throw badRequest("Current password is incorrect");
    }
    await pool.execute(userStatements.updatePassword, [
      await hashPassword(payload.newPassword),
      userId,
    ]);
  }

  if (payload.name) {
    const trimmed = payload.name.trim();
    await pool.execute("UPDATE users SET name = ? WHERE id = ?", [trimmed, userId]);
  }

  const [updatedRows] = await pool.execute(userStatements.findById, [userId]);
  return {
    user: publicUser(updatedRows[0]),
  };
}
