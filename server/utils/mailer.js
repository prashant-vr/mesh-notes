import nodemailer from 'nodemailer';

// Reads SMTP configuration from environment variables
export const getMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user) {
    return null; // SMTP not configured
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
};

export const isSmtpConfigured = () => {
  return Boolean(process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS));
};

export const sendVerificationEmail = async ({ to, token, hostUrl = 'http://localhost:3000' }) => {
  const verifyUrl = `${hostUrl}/app?verify=${encodeURIComponent(token)}`;
  const transporter = getMailTransporter();

  if (!transporter) {
    console.log('\n======================================================');
    console.log(`✉️ [DEV EMAIL SIMULATOR] Email verification link for ${to}:`);
    console.log(`🔗 Verification URL: ${verifyUrl}`);
    console.log(`🔑 Verification Token: ${token}`);
    console.log('======================================================\n');
    return { delivered: false, simulated: true, url: verifyUrl };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@meshnotes.local';

  const mailOptions = {
    from: `"Mesh Notes" <${from}>`,
    to,
    subject: 'Verify your Mesh Notes account',
    text: `Welcome to Mesh Notes!\n\nPlease verify your email address by clicking the link below:\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 2.5rem 1.5rem; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
          <div style="width: 32px; height: 32px; background: #0f172a; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 16px; text-align: center; line-height: 32px;">M</div>
          <span style="font-size: 18px; font-weight: 700; color: #0f172a; margin-left: 8px;">Mesh Notes</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">Verify your email address</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
          Welcome to Mesh Notes! Please confirm your email address by clicking the button below to complete your registration.
        </p>
        <div style="margin-bottom: 28px;">
          <a href="${verifyUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">Verify Email Address →</a>
        </div>
        <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 16px;">
          Or copy and paste this verification URL into your browser:<br />
          <a href="${verifyUrl}" style="color: #4f46e5; word-break: break-all;">${verifyUrl}</a>
        </p>
        <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
          This link will expire in 24 hours. If you did not create an account on Mesh Notes, you can safely ignore this email.
        </p>
      </div>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[SMTP] Verification email sent to ${to}. MessageId: ${info.messageId}`);
  return { delivered: true, simulated: false, messageId: info.messageId };
};
