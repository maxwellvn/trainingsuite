import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import ForumPost from '@/models/ForumPost';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Like a post
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const post = await ForumPost.findById(id);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    const userId = request.user!.id;

    // Check if already liked
    if (post.likedBy?.includes(userId)) {
      return errorResponse('You have already liked this post', 400);
    }

    // Add like
    await ForumPost.findByIdAndUpdate(id, {
      $inc: { likes: 1 },
      $addToSet: { likedBy: userId },
    });

    return successResponse({ likes: (post.likes || 0) + 1, isLiked: true }, 'Post liked');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Unlike a post
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const post = await ForumPost.findById(id);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    const userId = request.user!.id;

    // Check if not liked
    if (!post.likedBy?.includes(userId)) {
      return errorResponse('You have not liked this post', 400);
    }

    // Remove like
    await ForumPost.findByIdAndUpdate(id, {
      $inc: { likes: -1 },
      $pull: { likedBy: userId },
    });

    return successResponse({ likes: Math.max(0, (post.likes || 0) - 1), isLiked: false }, 'Post unliked');
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
