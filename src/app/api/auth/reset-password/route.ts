import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { validateBody } from '@/middleware/validate';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, resetPasswordSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { token, password } = validation.data;

    await connectDB();

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return errorResponse('Invalid or expired reset token', 400);
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return successResponse(null, 'Password has been reset successfully. You can now log in.');
  } catch (error) {
    return handleApiError(error);
  }
}
