import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { forgotPasswordSchema } from '@/lib/validations/auth';
import { validateBody } from '@/middleware/validate';
import { successResponse, handleApiError } from '@/lib/utils/api-response';
import { sendEmail, getPasswordResetEmailTemplate } from '@/lib/utils/email';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, forgotPasswordSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { email } = validation.data;

    await connectDB();

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return successResponse(
        null,
        'If an account with that email exists, you will receive a password reset link.'
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    // Send reset email
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
      await sendEmail({
        to: email,
        subject: 'Reset your password - Rhapsody Training Suite',
        html: getPasswordResetEmailTemplate(user.name, resetUrl),
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    return successResponse(
      null,
      'If an account with that email exists, you will receive a password reset link.'
    );
  } catch (error) {
    return handleApiError(error);
  }
}
