import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Enrollment from '@/models/Enrollment';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - Get all enrollments (admin only)
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const status = searchParams.get('status');
    const courseId = searchParams.get('course');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (courseId) query.course = courseId;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate({
          path: 'user',
          select: 'name email avatar',
        })
        .populate({
          path: 'course',
          select: 'title slug thumbnail',
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
  return withAdmin(request, getHandler);
}
