import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Comment from '@/models/Comment';
import ForumPost from '@/models/ForumPost';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateCommentSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update comment
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateCommentSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const comment = await Comment.findById(id);

    if (!comment) {
      return errorResponse('Comment not found', 404);
    }

    // Check permission (only owner can edit)
    if (request.user!.id !== comment.user.toString()) {
      return errorResponse('Not authorized to update this comment', 403);
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      {
        $set: {
          content: validation.data.content,
          isEdited: true,
        },
      },
      { new: true, runValidators: true }
    ).populate('user', 'name avatar');

    return successResponse(updatedComment, 'Comment updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete comment
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const comment = await Comment.findById(id);

    if (!comment) {
      return errorResponse('Comment not found', 404);
    }

    // Check permission (owner or admin)
    const isOwner = request.user!.id === comment.user.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to delete this comment', 403);
    }

    // Delete replies
    await Comment.deleteMany({ parent: id });

    // Update post comment count if it's a post comment
    if (comment.post) {
      const replyCount = await Comment.countDocuments({ parent: id });
      await ForumPost.findByIdAndUpdate(comment.post, {
        $inc: { commentCount: -(1 + replyCount) },
      });
    }

    // Delete comment
    await Comment.findByIdAndDelete(id);

    return successResponse(null, 'Comment deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => deleteHandler(req, context));
}
