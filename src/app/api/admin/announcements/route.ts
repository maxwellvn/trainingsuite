import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Announcement from '@/models/Announcement';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createAnnouncementSchema } from '@/lib/validations/admin';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';
import { NotificationType } from '@/types';

// GET - List announcements (admin only)
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const query: Record<string, unknown> = {};

    const isActive = searchParams.get('isActive');
    if (isActive !== null) query.isActive = isActive === 'true';

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(query),
    ]);

    return paginatedResponse(announcements, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create announcement (admin only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, createAnnouncementSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const announcement = await Announcement.create({
      ...validation.data,
      startsAt: validation.data.startsAt ? new Date(validation.data.startsAt) : undefined,
      expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : undefined,
      createdBy: request.user!.id,
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id).populate(
      'createdBy',
      'name'
    );

    // Send notifications to all users
    try {
      const allUsers = await User.find({ isActive: { $ne: false } }).select('_id');

      if (allUsers.length > 0) {
        const notifications = allUsers.map((user) => ({
          user: user._id,
          type: NotificationType.NEW_ANNOUNCEMENT,
          title: announcement.title,
          message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
          link: '/announcements',
          isRead: false,
          metadata: {
            announcementId: announcement._id,
            priority: announcement.priority,
          },
        }));

        await Notification.insertMany(notifications);
        console.log(`Sent announcement notification to ${allUsers.length} users`);
      }
    } catch (notificationError) {
      // Log error but don't fail the announcement creation
      console.error('Failed to send announcement notifications:', notificationError);
    }

    return successResponse(populatedAnnouncement, 'Announcement created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}

export async function POST(request: NextRequest) {
  return withAdmin(request, postHandler);
}
