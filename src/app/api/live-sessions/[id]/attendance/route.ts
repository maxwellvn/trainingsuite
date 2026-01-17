import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import LiveAttendance from '@/models/LiveAttendance';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get attendance list for a session
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const session = await LiveSession.findById(id);

    if (!session) {
      return errorResponse('Live session not found', 404);
    }

    // Check permission (instructor or admin)
    const isOwner = request.user!.id === session.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to view attendance', 403);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const [attendance, total] = await Promise.all([
      LiveAttendance.find({ session: id })
        .populate('user', 'name email avatar')
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(limit),
      LiveAttendance.countDocuments({ session: id }),
    ]);

    return paginatedResponse(attendance, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => getHandler(req, context));
}
