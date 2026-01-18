import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Notification from '@/models/Notification';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';

// GET - Get unread notification count
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const count = await Notification.countDocuments({
      user: request.user!.id,
      isRead: false,
    });

    return successResponse({ count });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request, getHandler);
}
