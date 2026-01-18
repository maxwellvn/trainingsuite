import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Certificate from '@/models/Certificate';
import '@/models/Course';
import '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - Get user's certificates
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const query = { user: request.user!.id };

    const [certificates, total] = await Promise.all([
      Certificate.find(query)
        .populate({
          path: 'course',
          select: 'title slug thumbnail instructor',
          populate: {
            path: 'instructor',
            select: 'name',
          },
        })
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit),
      Certificate.countDocuments(query),
    ]);

    return paginatedResponse(certificates, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request, getHandler);
}
