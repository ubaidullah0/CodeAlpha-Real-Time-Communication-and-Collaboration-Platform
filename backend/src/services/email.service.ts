import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true, // true for 465, false for other ports
    connectionTimeout: 5000, // 5 seconds timeout so it doesn't hang
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendPasswordResetEmail = async (toEmail: string, otp: string) => {
  if (process.env.NODE_ENV === 'test') {
    return true; 
  }

  // Safe diagnostic log without exposing the OTP
  console.log(`[SMTP PROXY] Dispatching password reset email for ${toEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || 'Collaboration Platform <noreply@collaboration.local>',
    to: toEmail,
    subject: 'Your Password Reset Code',
    text: `Your password reset code is: ${otp}\nThis code will expire in 2 minutes.\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #111827; margin-top: 0; font-size: 24px; font-weight: 600;">Password Reset</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">We received a request to reset the password for your account. Enter the following 6-digit code to proceed:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 36px; letter-spacing: 8px; color: #2563eb; font-weight: 700;">${otp}</h1>
        </div>
        
        <p style="color: #ef4444; font-size: 14px; font-weight: 500; margin-bottom: 20px;">⚠️ This code will expire in exactly 2 minutes.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 10px;">Best regards,<br/><strong>Real-Time Communication and Collaboration Platform</strong></p>
      </div>
    `,
  };

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'https://code-alpha-real-time-communication-five.vercel.app';
    const response = await fetch(`${frontendUrl}/api/sendEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail,
        otp,
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
        from: process.env.SMTP_FROM || process.env.SMTP_USER
      })
    });

    if (!response.ok) {
      console.error('Vercel email proxy failed:', await response.text());
      return false;
    }

    console.log('Email sent successfully via Vercel Proxy');
    return true;
  } catch (error) {
    console.error('Error sending email via proxy:', error);
    return false;
  }
};
