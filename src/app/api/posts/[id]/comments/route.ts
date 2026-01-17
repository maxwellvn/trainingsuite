import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import ForumPost from '@/models/ForumPost';
import Comment from '@/models/Comment';
import Notification from '@/models/Notification';
import { withAuth, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createCommentSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';
import { NotificationType } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get comments for a post
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    await connectDB();

    const post = await ForumPost.findById(postId);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    // Get top-level comments
    const [comments, total] = await Promise.all([
      Comment.find({ post: postId, parent: null })
        .populate('user', 'name avatar')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ post: postId, parent: null }),
    ]);

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parent: comment._id })
          .populate('user', 'name avatar')
          .sort({ createdAt: 1 });

        return {
          ...comment.toObject(),
          replies,
        };
      })
    );

    return paginatedResponse(commentsWithReplies, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Add comment to post
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const validation = await validateBody(request, createCommentSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const post = await ForumPost.findById(postId);

    if (!post) {
      return errorResponse('Post not found', 404);
    }

    if (post.isLocked) {
      return errorResponse('This post is locked and cannot receive comments', 403);
    }

    const comment = await Comment.create({
      content: validation.data.content,
      post: postId,
      user: request.user!.id,
      parent: validation.data.parent || null,
    });

    // Update post comment count
    await ForumPost.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });

    // Notify post author if commenter is different
    if (post.user.toString() !== request.user!.id) {
      await Notification.create({
        user: post.user,
        type: NotificationType.FORUM_REPLY,
        title: 'New Comment',
        message: `Someone commented on your post "${post.title}"`,
        link: `/forums/posts/${postId}`,
      });
    }

    // Notify parent comment author if replying
    if (validation.data.parent) {
      const parentComment = await Comment.findById(validation.data.parent);
      if (parentComment && parentComment.user.toString() !== request.user!.id) {
        await Notification.create({
          user: parentComment.user,
          type: NotificationType.COMMENT_REPLY,
          title: 'New Reply',
          message: 'Someone replied to your comment',
          link: `/forums/posts/${postId}`,
        });
      }
    }

    const populatedComment = await Comment.findById(comment._id).populate('user', 'name avatar');

    return successResponse(populatedComment, 'Comment added successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}
