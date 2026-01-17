import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { LiveSessionStatus, UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - End live session
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const session = await LiveSession.findById(id);

    if (!session) {
      return errorResponse('Live session not found', 404);
    }

    // Check permission
    const isOwner = request.user!.id === session.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to end this session', 403);
    }

    if (session.status === LiveSessionStatus.ENDED) {
      return errorResponse('Session has already ended', 400);
    }

    // Get recording URL from request body if provided
    let recordingUrl;
    try {
      const body = await request.json();
      recordingUrl = body.recordingUrl;
    } catch {
      // No body provided
    }

    // Update session status
    const updateData: Record<string, unknown> = {
      status: LiveSessionStatus.ENDED,
    };

    if (recordingUrl) {
      updateData.recordingUrl = recordingUrl;
    }

    const updatedSession = await LiveSession.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate('instructor', 'name avatar')
      .populate('course', 'title slug');

    return successResponse(updatedSession, 'Live session ended');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => postHandler(req, context));
}
