import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Enrollment from '@/models/Enrollment';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

// GET - Get enrollment details for a specific course
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { courseId } = await params;
    await connectDB();

    const enrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: courseId,
    }).populate({
      path: 'course',
      select: 'title slug thumbnail instructor duration',
      populate: {
        path: 'instructor',
        select: 'name avatar',
      },
    });

    if (!enrollment) {
      return errorResponse('Enrollment not found', 404);
    }

    return successResponse(enrollment);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
