import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateLiveSessionSchema } from '@/lib/validations/live-session';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole, LiveSessionStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get live session by ID
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    let session = await LiveSession.findById(id)
      .populate('instructor', 'name avatar bio title')
      .populate('course', 'title slug thumbnail');

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
      )
        .populate('instructor', 'name avatar bio title')
        .populate('course', 'title slug thumbnail');
    }

    return successResponse(session);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update live session
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateLiveSessionSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const session = await LiveSession.findById(id);

    if (!session) {
      return errorResponse('Live session not found', 404);
    }

    // Check permission
    const isOwner = request.user!.id === session.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to update this session', 403);
    }

    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.scheduledAt) {
      updateData.scheduledAt = new Date(validation.data.scheduledAt);
    }

    const updatedSession = await LiveSession.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('instructor', 'name avatar')
      .populate('course', 'title slug');

    return successResponse(updatedSession, 'Live session updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete live session
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
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
      return errorResponse('Not authorized to delete this session', 403);
    }

    await LiveSession.findByIdAndDelete(id);

    return successResponse(null, 'Live session deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => deleteHandler(req, context));
}
