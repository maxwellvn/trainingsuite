import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Forum from '@/models/Forum';
import ForumPost from '@/models/ForumPost';
import Comment from '@/models/Comment';
import { withAuth, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateForumPostSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get post by ID
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const post = await ForumPost.findById(id)
      .populate('user', 'name avatar')
      .populate('forum', 'title');

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    // Increment view count
    await ForumPost.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    return successResponse(post);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update post
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateForumPostSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const post = await ForumPost.findById(id);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    // Check permission (owner or admin)
    const isOwner = request.user!.id === post.user.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to update this post', 403);
    }

    // Only admin can pin/lock posts
    if ((validation.data.isPinned !== undefined || validation.data.isLocked !== undefined) && !isAdmin) {
      return errorResponse('Only admins can pin or lock posts', 403);
    }

    const updatedPost = await ForumPost.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).populate('user', 'name avatar');

    return successResponse(updatedPost, 'Post updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete post
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const post = await ForumPost.findById(id);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    // Check permission (owner or admin)
    const isOwner = request.user!.id === post.user.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to delete this post', 403);
    }

    // Delete all comments on this post
    await Comment.deleteMany({ post: id });

    // Update forum post count
    await Forum.findByIdAndUpdate(post.forum, { $inc: { postCount: -1 } });

    // Delete post
    await ForumPost.findByIdAndDelete(id);

    return successResponse(null, 'Post deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => deleteHandler(req, context));
}
