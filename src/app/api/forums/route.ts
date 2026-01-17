import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Forum from '@/models/Forum';
import { withAdmin, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createForumSchema } from '@/lib/validations/engagement';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - List all forums
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const isGeneral = searchParams.get('isGeneral');

    const query: Record<string, unknown> = { isActive: true };
    if (isGeneral !== null) {
      query.isGeneral = isGeneral === 'true';
    }

    const [forums, total] = await Promise.all([
      Forum.find(query)
        .populate('course', 'title slug')
        .populate('createdBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Forum.countDocuments(query),
    ]);

    return paginatedResponse(forums, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create forum (admin only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, createForumSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const forum = await Forum.create({
      ...validation.data,
      createdBy: request.user!.id,
    });

    const populatedForum = await Forum.findById(forum._id)
      .populate('course', 'title slug')
      .populate('createdBy', 'name avatar');

    return successResponse(populatedForum, 'Forum created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return optionalAuth(request, getHandler);
}

export async function POST(request: NextRequest) {
  return withAdmin(request, postHandler);
}
