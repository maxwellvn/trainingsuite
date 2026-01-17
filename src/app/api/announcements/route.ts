import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Announcement from '@/models/Announcement';
import { optionalAuth, AuthenticatedRequest } from '@/middleware/auth';
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - List active announcements (public)
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams, 5);

    const now = new Date();

    const query = {
      isActive: true,
      $or: [
        { startsAt: { $exists: false } },
        { startsAt: { $lte: now } },
      ],
      $and: [
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
    };

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Announcement.countDocuments(query),
    ]);

    return paginatedResponse(announcements, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return optionalAuth(request, getHandler);
}
