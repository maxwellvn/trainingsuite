import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import LiveAttendance from '@/models/LiveAttendance';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { LiveSessionStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Join live session
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const session = await LiveSession.findById(id);

    if (!session) {
      return errorResponse('Live session not found', 404);
    }

    if (session.status !== LiveSessionStatus.LIVE) {
      return errorResponse('Session is not currently live', 400);
    }

    // Check max attendees
    if (session.maxAttendees && session.attendeeCount >= session.maxAttendees) {
      return errorResponse('Session is full', 400);
    }

    // Check for existing attendance
    let attendance = await LiveAttendance.findOne({
      session: id,
      user: request.user!.id,
    });

    if (attendance) {
      // User rejoining
      attendance.joinedAt = new Date();
      attendance.leftAt = undefined;
      await attendance.save();
    } else {
      // New attendance
      attendance = await LiveAttendance.create({
        session: id,
        user: request.user!.id,
        joinedAt: new Date(),
      });

      // Increment attendee count
      await LiveSession.findByIdAndUpdate(id, { $inc: { attendeeCount: 1 } });
    }

    return successResponse(
      {
        attendance: {
          _id: attendance._id,
          joinedAt: attendance.joinedAt,
        },
        streamUrl: session.streamUrl,
        streamProvider: session.streamProvider,
      },
      'Joined session successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}
