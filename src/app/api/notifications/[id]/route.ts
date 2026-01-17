import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Notification from '@/models/Notification';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Delete notification
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: request.user!.id,
    });

    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    return successResponse(null, 'Notification deleted');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => deleteHandler(req, context));
}
