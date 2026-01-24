import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Forum from '@/models/Forum';
import ForumPost from '@/models/ForumPost';
import { withAuth, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createForumPostSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get posts in a forum
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: forumId } = await params;
    await connectDB();

    const forum = await Forum.findById(forumId);

    if (!forum || !forum.isActive) {
      return errorResponse('Forum not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const [posts, total] = await Promise.all([
      ForumPost.find({ forum: forumId })
        .populate('user', 'name avatar')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ForumPost.countDocuments({ forum: forumId }),
    ]);

    // Add isLiked field if user is authenticated
    const postsWithLikeStatus = posts.map(post => {
      const postObj = post.toObject();
      if (request.user) {
        postObj.isLiked = post.likedBy?.some((userId: any) => userId.toString() === request.user!.id) || false;
      }
      return postObj;
    });

    return paginatedResponse(postsWithLikeStatus, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create post in forum
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: forumId } = await params;
    const validation = await validateBody(request, createForumPostSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const forum = await Forum.findById(forumId);

    if (!forum || !forum.isActive) {
      return errorResponse('Forum not found', 404);
    }

    const post = await ForumPost.create({
      ...validation.data,
      forum: forumId,
      user: request.user!.id,
    });

    // Update forum post count
    await Forum.findByIdAndUpdate(forumId, { $inc: { postCount: 1 } });

    const populatedPost = await ForumPost.findById(post._id).populate('user', 'name avatar');

    return successResponse(populatedPost, 'Post created successfully', 201);
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
