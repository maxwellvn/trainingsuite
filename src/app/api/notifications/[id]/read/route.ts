import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Notification from '@/models/Notification';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Mark notification as read
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: request.user!.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    return successResponse(notification, 'Notification marked as read');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => putHandler(req, context));
}
