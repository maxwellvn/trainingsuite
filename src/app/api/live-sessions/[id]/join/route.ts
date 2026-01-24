import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import LiveAttendance from '@/models/LiveAttendance';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { LiveSessionStatus } from '@/types';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Join live session
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    let session = await LiveSession.findById(id);

    if (!session) {
      return errorResponse('Live session not found', 404);
    }

    // Auto-start: If session is scheduled, has a stream URL, and scheduled time has passed
    if (
      session.status === LiveSessionStatus.SCHEDULED &&
      session.streamUrl &&
      new Date(session.scheduledAt) <= new Date()
    ) {
      session = await LiveSession.findByIdAndUpdate(
        id,
        { $set: { status: LiveSessionStatus.LIVE } },
        { new: true }
      );
    }

    // Check if session is live or can be joined
    if (session!.status !== LiveSessionStatus.LIVE) {
      // If session has a stream URL and is scheduled for the future, return info for "notify me"
      if (session!.status === LiveSessionStatus.SCHEDULED && session!.streamUrl) {
        return errorResponse('Session has not started yet. You will be notified when it begins.', 400);
      }
      return errorResponse('Session is not currently live', 400);
    }

    // Check max attendees
    if (session!.maxAttendees && session!.attendeeCount >= session!.maxAttendees) {
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

      // Increment attendee count in DB
      await LiveSession.findByIdAndUpdate(id, { $inc: { attendeeCount: 1 } });
      
      // Also track in Redis for real-time count (expires after 2 hours)
      await cache.incr(CACHE_KEYS.liveSessionAttendees(id), CACHE_TTL.VERY_LONG);
    }
    
    // Invalidate session cache so attendee count is fresh
    await cache.del(CACHE_KEYS.liveSessionById(id));

    return successResponse(
      {
        attendance: {
          _id: attendance._id,
          joinedAt: attendance.joinedAt,
        },
        streamUrl: session!.streamUrl,
        streamProvider: session!.streamProvider,
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
