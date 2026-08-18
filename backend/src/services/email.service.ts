import nodemailer from 'nodemailer';



export const sendPasswordResetEmail = async (toEmail: string, otp: string) => {
  if (process.env.NODE_ENV === 'test') {
    return true; 
  }

  // Safe diagnostic log without exposing the OTP
  console.log(`[SMTP PROXY] Dispatching password reset email for ${toEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);

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
