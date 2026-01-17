import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

async function handler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const user = await User.findById(request.user!.id).select('-password');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio,
      phone: user.phone,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request, handler);
}
