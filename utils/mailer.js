import { Resend } from "resend";

/**
 * Sends an email through Resend. Email delivery is skipped when no API key is
 * configured, which keeps local development usable without mail credentials.
 *
 * @param {{ to: string, subject: string, text: string, html: string }} options
 */
export async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM_EMAIL || process.env.MAIL_FROM;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL must be configured to send email");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }
}
