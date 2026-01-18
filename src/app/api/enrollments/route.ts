import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Enrollment from '@/models/Enrollment';
import '@/models/Course';
import '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - Get user's enrollments
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { user: request.user!.id };
    if (status) query.status = status;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate({
          path: 'course',
          select: 'title slug thumbnail instructor duration level rating status isPublished',
          populate: {
            path: 'instructor',
            select: 'name avatar',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments(query),
    ]);

    return paginatedResponse(enrollments, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request, getHandler);
}
