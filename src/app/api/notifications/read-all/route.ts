import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Notification from '@/models/Notification';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';

// PUT - Mark all notifications as read
async function putHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    await Notification.updateMany(
      { user: request.user!.id, isRead: false },
      { $set: { isRead: true } }
    );

    return successResponse(null, 'All notifications marked as read');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  return withAuth(request, putHandler);
}
