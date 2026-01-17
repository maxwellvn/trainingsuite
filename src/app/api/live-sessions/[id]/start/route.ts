import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import Notification from '@/models/Notification';
import Enrollment from '@/models/Enrollment';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { LiveSessionStatus, NotificationType, UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Start live session
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
      return errorResponse('Not authorized to start this session', 403);
    }

    if (session.status === LiveSessionStatus.LIVE) {
      return errorResponse('Session is already live', 400);
    }

    if (session.status === LiveSessionStatus.ENDED) {
      return errorResponse('Session has already ended', 400);
    }

    // Update session status
    const updatedSession = await LiveSession.findByIdAndUpdate(
      id,
      {
        $set: {
          status: LiveSessionStatus.LIVE,
        },
      },
      { new: true }
    )
      .populate('instructor', 'name avatar')
      .populate('course', 'title slug');

    // Notify enrolled users if session is for a course
    if (session.course) {
      const enrollments = await Enrollment.find({ course: session.course });
      const notifications = enrollments.map((enrollment) => ({
        user: enrollment.user,
        type: NotificationType.LIVE_SESSION_STARTED,
        title: 'Live Session Started',
        message: `"${session.title}" is now live!`,
        link: `/live-sessions/${id}`,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    return successResponse(updatedSession, 'Live session started');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => postHandler(req, context));
}
