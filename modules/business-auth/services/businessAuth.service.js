import pool from "../../../config/db.js";
import {
  businessAccountStatements,
  businessStatements,
  passwordResetStatements,
} from "../../../config/statement.js";
import {
  createBusinessToken,
  generateResetToken,
  hashPassword,
  normalizeEmail,
  publicBusinessAccount,
  slugify,
  verifyPassword,
} from "../../../utils/auth.js";
import { badRequest, conflict, forbidden, unauthorized } from "../../../utils/errors.js";
import { passwordResetEmail, businessWelcomeEmail } from "../../../utils/emailtemplates.js";
import { sendMail } from "../../../utils/mailer.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getResetUrl(rawToken) {
  const base = process.env.FRONTEND_URL || "http://localhost:3000";
  return `${base}/reset-password?token=${rawToken}`;
}

async function sendWelcomeEmail({ to, ownerName, businessName }) {
  const message = businessWelcomeEmail({ ownerName, businessName });
  await sendMail({ to, ...message });
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createBusinessAccount(payload) {
  const connection = await pool.getConnection();

  try {
    const ownerName = String(payload.ownerName || "").trim();
    const businessName = String(payload.businessName || "").trim();
    const email = normalizeEmail(payload.email);
    const phone = String(payload.phone || "").trim();
    const password = String(payload.password || "");

    const [existingRows] = await connection.execute(
      businessAccountStatements.findExisting,
      [email, phone]
    );

    if (existingRows.length) {
      throw conflict("A business account with this email or phone already exists");
    }

    await connection.beginTransaction();

    const [result] = await connection.execute(businessAccountStatements.create, [
      businessName,
      ownerName,
      email,
      phone,
      await hashPassword(password),
    ]);

    const accountId = result.insertId;

    if (businessName) {
      await connection.execute(businessStatements.createDraft, [
        accountId,
        businessName,
        `${slugify(businessName)}-${accountId}`,
        email,
        phone,
      ]);
    }

    const [createdRows] = await connection.execute(
      businessAccountStatements.findById,
      [accountId]
    );

    await connection.commit();

    sendWelcomeEmail({ to: email, ownerName, businessName }).catch((err) => {
      console.error("Failed to send welcome email:", err.message);
    });

    const account = createdRows[0];

    return {
      token: createBusinessToken(account),
      account: publicBusinessAccount(account),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function loginBusinessAccount(payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  const [rows] = await pool.execute(businessAccountStatements.findByEmail, [
    email,
  ]);

  if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) {
    throw unauthorized("Invalid email or password");
  }

  if (rows[0].status !== "active") {
    throw forbidden("This business account is not active");
  }

  await pool.execute(businessAccountStatements.updateLastLogin, [rows[0].id]);

  const [updatedRows] = await pool.execute(
    businessAccountStatements.findById,
    [rows[0].id]
  );
  const account = updatedRows[0];

  return {
    token: createBusinessToken(account),
    account: publicBusinessAccount(account),
  };
}

/**
 * Generates a password reset token and emails the reset link.
 * Always resolves without error to prevent email enumeration.
 */
export async function forgotBusinessPassword(email) {
  const normalised = normalizeEmail(email);

  const [rows] = await pool.execute(businessAccountStatements.findByEmail, [
    normalised,
  ]);

  // Silently return — do not reveal whether the email exists
  if (!rows.length || rows[0].status !== "active") {
    return;
  }

  const account = rows[0];
  const { rawToken, tokenHash } = generateResetToken();

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await pool.execute(passwordResetStatements.create, [
    "business",
    account.id,
    null,
    tokenHash,
    expiresAt,
  ]);

  const resetUrl = getResetUrl(rawToken);
  const message = passwordResetEmail({ resetUrl, name: account.owner_name });

  sendMail({ to: normalised, ...message }).catch((err) => {
    console.error("Failed to send password reset email:", err.message);
  });
}

/**
 * Validates the reset token and updates the account's password.
 */
export async function resetBusinessPassword(rawToken, newPassword) {
  const crypto = await import("crypto");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const [tokenRows] = await pool.execute(
    passwordResetStatements.findByTokenHash,
    [tokenHash]
  );

  if (!tokenRows.length || tokenRows[0].account_type !== "business") {
    throw badRequest("Invalid or expired reset token");
  }

  const tokenRecord = tokenRows[0];

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(businessAccountStatements.updatePassword, [
      await hashPassword(newPassword),
      tokenRecord.business_account_id,
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
