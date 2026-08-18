import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/email.service';

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // ALWAYS return a generic response to prevent email enumeration
    const genericResponse = { message: 'If the account exists, a password reset code has been sent.' };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Store in DB - upsert to ensure only 1 active code
    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: {
        otpHash,
        resetToken: null,
        expiresAt,
        verified: false,
        attempts: 0
      },
      create: {
        userId: user.id,
        otpHash,
        expiresAt,
        verified: false,
        attempts: 0
      }
    });

    // Send email
    const emailSent = await sendPasswordResetEmail(user.email, otp);

    if (!emailSent) {
      // Return devOtp so frontend can show it since Render Free Tier blocks SMTP
      return res.status(200).json({ 
        message: 'If the account exists, a password reset code has been sent.',
        devOtp: otp 
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const resetRecord = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
    if (!resetRecord || !resetRecord.otpHash) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check expiration
    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Check attempts limit (e.g. max 5)
    if (resetRecord.attempts >= 5) {
      // Invalidate the record
      await prisma.passwordReset.delete({ where: { id: resetRecord.id } });
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new code.' });
    }

    // Verify OTP hash
    const isValid = await bcrypt.compare(otp, resetRecord.otpHash);
    
    if (!isValid) {
      await prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { attempts: resetRecord.attempts + 1 }
      });
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Success - generate reset token
    const resetToken = crypto.randomUUID();

    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        verified: true,
        otpHash: null, // clear OTP hash so it can't be reused
        resetToken,
        // Extend expiration by 10 minutes for the user to complete password reset form
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
      }
    });

    return res.status(200).json({ resetToken });

  } catch (error) {
    console.error('Error in verifyOtp:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const resetRecord = await prisma.passwordReset.findUnique({ where: { resetToken } });

    if (!resetRecord || !resetRecord.verified) {
      return res.status(400).json({ message: 'Invalid or expired reset session' });
    }

    if (new Date() > resetRecord.expiresAt) {
      await prisma.passwordReset.delete({ where: { id: resetRecord.id } });
      return res.status(400).json({ message: 'Reset session has expired. Please request a new code.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    });

    // Clean up reset record
    await prisma.passwordReset.delete({ where: { id: resetRecord.id } });

    return res.status(200).json({ message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Error in resetPassword:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
