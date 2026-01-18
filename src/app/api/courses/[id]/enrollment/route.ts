import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Enrollment from '@/models/Enrollment';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Check if user is enrolled in a course
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const enrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: course._id,
    }).populate({
      path: 'course',
      select: 'title slug thumbnail instructor duration',
      populate: {
        path: 'instructor',
        select: 'name avatar',
      },
    });

    return successResponse({
      isEnrolled: !!enrollment,
      enrollment: enrollment || undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
