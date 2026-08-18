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

    const mailOptions = {
      from: from || user,
      to: toEmail,
      subject: 'Password Reset Verification Code - SyncSpace',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Your verification code is: <strong>${otp}</strong></p>
        <p>This code will expire in 2 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>`
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Email sent successfully via Vercel' });
  } catch (error) {
    console.error('Vercel SMTP Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
}
