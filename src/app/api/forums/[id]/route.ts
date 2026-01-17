import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Forum from '@/models/Forum';
import ForumPost from '@/models/ForumPost';
import { withAdmin, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateForumSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get forum by ID
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const forum = await Forum.findById(id)
      .populate('course', 'title slug')
      .populate('createdBy', 'name avatar');

    if (!forum || !forum.isActive) {
      return errorResponse('Forum not found', 404);
    }

    return successResponse(forum);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update forum (admin only)
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateForumSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const forum = await Forum.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    )
      .populate('course', 'title slug')
      .populate('createdBy', 'name avatar');

    if (!forum) {
      return errorResponse('Forum not found', 404);
    }

    return successResponse(forum, 'Forum updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete forum (admin only)
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const forum = await Forum.findById(id);

    if (!forum) {
      return errorResponse('Forum not found', 404);
    }

    // Delete all posts in this forum
    await ForumPost.deleteMany({ forum: id });

    // Delete forum
    await Forum.findByIdAndDelete(id);

    return successResponse(null, 'Forum deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => deleteHandler(req, context));
}
