import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Notification from '@/models/Notification';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { handleApiError } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - Get user notifications
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams, 20);
    const isRead = searchParams.get('isRead');

    const query: Record<string, unknown> = { user: request.user!.id };
    if (isRead !== null) query.isRead = isRead === 'true';

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: request.user!.id, isRead: false }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request, getHandler);
}
