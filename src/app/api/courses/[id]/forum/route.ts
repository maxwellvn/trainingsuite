import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Forum from '@/models/Forum';
import { optionalAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get forum for a course
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const courseId = course._id;

    const forum = await Forum.findOne({ course: courseId, isActive: true })
      .populate('createdBy', 'name avatar');

    if (!forum) {
      return errorResponse('Forum not found for this course', 404);
    }

    return successResponse(forum);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}
