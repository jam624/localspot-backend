// utils/resendOTP.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || 'Acme <onboarding@curriumx.online>';

/**
 * Generate a numeric OTP.
 */
export const generateOTP = (length = 6) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

const otpTemplate = (name = 'there', otp) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;">
    <h2 style="margin:0 0 8px;color:#111827;">Password reset code</h2>
    <p style="color:#4b5563;margin:0 0 24px;">Hi ${name}, use the code below to reset your password.</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:10px;padding:18px 24px;background:#f3f4f6;border-radius:10px;text-align:center;color:#111827;">
      ${otp}
    </div>
    <p style="color:#6b7280;font-size:14px;margin:24px 0 0;">
      This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.
    </p>
  </div>
`;

/**
 * Send an OTP email through Resend.
 * @returns {Promise<{id: string}>}
 */
export const sendOTPEmail = async ({
  to,
  name,
  otp,
  subject = 'Your password reset code',
}) => {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html: otpTemplate(name, otp),
    });

    if (error) throw new Error(error.message || 'Resend failed to send email');

    return data;
  } catch (err) {
    console.error('[resendOTP] send failed:', err.message);
    throw err;
  }
};