import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Comment from '@/models/Comment';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Like a comment
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const comment = await Comment.findById(id);

    if (!comment) {
      return errorResponse('Comment not found', 404);
    }

    const userId = request.user!.id;

    // Check if already liked
    if (comment.likedBy?.includes(userId)) {
      return errorResponse('You have already liked this comment', 400);
    }

    // Add like
    await Comment.findByIdAndUpdate(id, {
      $inc: { likes: 1 },
      $addToSet: { likedBy: userId },
    });

    return successResponse({ likes: (comment.likes || 0) + 1, isLiked: true }, 'Comment liked');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Unlike a comment
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const comment = await Comment.findById(id);

    if (!comment) {
      return errorResponse('Comment not found', 404);
    }

    const userId = request.user!.id;

    // Check if not liked
    if (!comment.likedBy?.includes(userId)) {
      return errorResponse('You have not liked this comment', 400);
    }

    // Remove like
    await Comment.findByIdAndUpdate(id, {
      $inc: { likes: -1 },
      $pull: { likedBy: userId },
    });

    return successResponse({ likes: Math.max(0, (comment.likes || 0) - 1), isLiked: false }, 'Comment unliked');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => deleteHandler(req, context));
}
