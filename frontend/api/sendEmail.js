import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { toEmail, otp, host, port, user, pass, from } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: parseInt(port || '465', 10),
      secure: true,
      auth: { user, pass },
    });

    const senderName = "Real-Time Communication Platform";
    const mailOptions = {
      from: `"${senderName}" <${user}>`,
      to: toEmail,
      subject: `Password Reset Verification Code - Real-Time Communication Platform`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%); padding: 32px 24px; text-align: center;">
            <div style="display: inline-block; width: 48px; height: 48px; background-color: rgba(255, 255, 255, 0.2); border-radius: 12px; margin-bottom: 12px; text-align: center; line-height: 48px;">
              <span style="font-size: 24px;">🔒</span>
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.025em;">
              Real-Time Communication Platform
            </h1>
            <p style="margin: 6px 0 0 0; color: #e0e7ff; font-size: 14px; font-weight: 400;">
              Account Security & Password Reset
            </p>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px 28px;">
            <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 18px; font-weight: 600;">
              Verification Code
            </h2>
            <p style="margin: 0 0 24px 0; color: #475569; font-size: 14px; line-height: 1.6;">
              We received a request to reset your password. Use the 6-digit verification code below to complete your password reset:
            </p>

            <!-- OTP Box -->
            <div style="background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #4f46e5; text-indent: 10px;">
                ${otp}
              </div>
            </div>

            <!-- Expiration Warning -->
            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
              <p style="margin: 0; color: #9a3412; font-size: 13px; font-weight: 500; display: flex; align-items: center;">
                ⏱️ <strong>Note:</strong> This verification code will expire in <strong>2 minutes</strong>.
              </p>
            </div>

            <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
              If you didn't request a password reset, you can safely ignore this email. Your account remains completely secure.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 500;">
              © 2026 Real-Time Communication and Collaboration Platform. All rights reserved.
            </p>
          </div>

        </div>
      </body>
      </html>`
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Email sent successfully via Vercel' });
  } catch (error) {
    console.error('Vercel SMTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
}
