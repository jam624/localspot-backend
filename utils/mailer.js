import nodemailer from "nodemailer";

/**
 * Returns a configured nodemailer transport, or null when SMTP is not
 * configured (e.g. in local development without email credentials).
 */
export function getMailer() {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD || "",
        }
      : undefined,
  });
}

/**
 * Sends a single email. Silently skips if SMTP is not configured.
 *
 * @param {{ to: string, subject: string, text: string, html: string }} options
 */
export async function sendMail({ to, subject, text, html }) {
  const mailer = getMailer();

  if (!mailer) {
    return;
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM || "LocalSpot <no-reply@localspot.test>",
    to,
    subject,
    text,
    html,
  });
}
