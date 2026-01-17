import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return errorResponse('Verification token is required', 400);
    }

    await connectDB();

    // Find user with matching verification token
    const user = await User.findOne({ verificationToken: token }).select('+verificationToken');

    if (!user) {
      return errorResponse('Invalid verification token', 400);
    }

    if (user.isVerified) {
      return successResponse(null, 'Email is already verified');
    }

    // Verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return successResponse(null, 'Email verified successfully. You can now log in.');
  } catch (error) {
    return handleApiError(error);
  }
}
