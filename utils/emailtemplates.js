export function businessWelcomeEmail({ ownerName, businessName }) {
  const displayName = ownerName || "there";
  const listingText = businessName
    ? `Your draft listing for ${businessName} has also been created.`
    : "You can now create and manage your business listing.";

  return {
    subject: "Welcome to LocalSpot",
    text: `Hi ${displayName}, welcome to LocalSpot. ${listingText}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Welcome to LocalSpot</h2>
        <p>Hi ${displayName},</p>
        <p>Your business account has been created successfully.</p>
        <p>${listingText}</p>
      </div>
    `,
  };
}

/**
 * Password reset email template — shared by both business and admin flows.
 *
 * @param {{ resetUrl: string, name: string }} options
 */
export function passwordResetEmail({ resetUrl, name }) {
  const displayName = name || "there";

  return {
    subject: "Reset your LocalSpot password",
    text: `Hi ${displayName}, use the link below to reset your password. It expires in 1 hour.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Reset your password</h2>
        <p>Hi ${displayName},</p>
        <p>Click the button below to reset your LocalSpot password. This link expires in <strong>1 hour</strong>.</p>
        <p style="margin: 24px 0;">
          <a
            href="${resetUrl}"
            style="
              background: #2563eb;
              color: #fff;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
            "
          >Reset password</a>
        </p>
        <p style="color: #6b7280; font-size: 0.875rem;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
