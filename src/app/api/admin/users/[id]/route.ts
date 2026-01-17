import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateUserRoleSchema } from '@/lib/validations/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get user details (admin only)
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const user = await User.findById(id).select('-password');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Get enrollment count
    const enrollmentCount = await Enrollment.countDocuments({ user: id });

    return successResponse({
      ...user.toObject(),
      enrollmentCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update user (admin only)
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateUserRoleSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    // Prevent admin from changing their own role
    if (id === request.user!.id) {
      return errorResponse('Cannot change your own role', 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role: validation.data.role } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user, 'User role updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Deactivate user (admin only)
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    // Prevent admin from deleting themselves
    if (id === request.user!.id) {
      return errorResponse('Cannot delete your own account', 400);
    }

    const user = await User.findById(id);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Soft delete by setting isVerified to false or you can add an isActive field
    // For now, we'll actually delete the user
    await User.findByIdAndDelete(id);

    return successResponse(null, 'User deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => deleteHandler(req, context));
}
