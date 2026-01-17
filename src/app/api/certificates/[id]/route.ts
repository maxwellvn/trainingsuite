import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Certificate from '@/models/Certificate';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get certificate by ID
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const certificate = await Certificate.findById(id)
      .populate({
        path: 'course',
        select: 'title slug thumbnail instructor',
        populate: {
          path: 'instructor',
          select: 'name',
        },
      })
      .populate('user', 'name email');

    if (!certificate) {
      return errorResponse('Certificate not found', 404);
    }

    // Only owner or admin can view
    const isOwner = request.user!.id === certificate.user._id.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to view this certificate', 403);
    }

    return successResponse(certificate);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
