import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateProfileSchema } from '@/lib/validations/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

async function handler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, updateProfileSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      request.user!.id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
        isVerified: user.isVerified,
      },
      'Profile updated successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  return withAuth(request, handler);
}
