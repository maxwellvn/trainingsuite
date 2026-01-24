import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import LiveSession from '@/models/LiveSession';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createLiveSessionSchema } from '@/lib/validations/live-session';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams, getSortParams } from '@/lib/utils/pagination';
import { LiveSessionStatus } from '@/types';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/redis';

// GET - List live sessions
async function getHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sort = getSortParams(searchParams, ['scheduledAt', 'createdAt'], 'scheduledAt');

    const query: Record<string, unknown> = {};

    const status = searchParams.get('status');
    if (status) {
      query.status = status;
    } else {
      // Default: show scheduled and live sessions
      query.status = { $in: [LiveSessionStatus.SCHEDULED, LiveSessionStatus.LIVE] };
    }

    const courseId = searchParams.get('course');
    if (courseId) query.course = courseId;

    const upcoming = searchParams.get('upcoming');
    if (upcoming === 'true') {
      query.scheduledAt = { $gte: new Date() };
    }

    // Cache key for public requests (no specific filters)
    const cacheKey = !courseId && !status && !upcoming 
      ? CACHE_KEYS.liveSessionsList(page, limit) 
      : null;

    // Try cache first
    if (cacheKey) {
      const cached = await cache.get<{ sessions: unknown[]; total: number }>(cacheKey);
      if (cached) {
        return paginatedResponse(cached.sessions, { page, limit, total: cached.total });
      }
    }

    await connectDB();

    const [sessions, total] = await Promise.all([
      LiveSession.find(query)
        .populate('instructor', 'name avatar')
        .populate('course', 'title slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveSession.countDocuments(query),
    ]);

    // Cache for shorter time since live sessions change frequently
    if (cacheKey) {
      await cache.set(cacheKey, { sessions, total }, CACHE_TTL.SHORT);
    }

    return paginatedResponse(sessions, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create live session (admin/instructor only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, createLiveSessionSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const session = await LiveSession.create({
      ...validation.data,
      instructor: request.user!.id,
      scheduledAt: new Date(validation.data.scheduledAt),
      status: LiveSessionStatus.SCHEDULED,
    });

    const populatedSession = await LiveSession.findById(session._id)
      .populate('instructor', 'name avatar')
      .populate('course', 'title slug');

    // Invalidate live sessions cache
    await cache.del(CACHE_KEYS.patterns.allLiveSessions);

    return successResponse(populatedSession, 'Live session created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return optionalAuth(request, getHandler);
}

export async function POST(request: NextRequest) {
  return withInstructor(request, postHandler);
}
