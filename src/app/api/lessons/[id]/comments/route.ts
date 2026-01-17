import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Comment from '@/models/Comment';
import Enrollment from '@/models/Enrollment';
import { withAuth, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createCommentSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';
import { EnrollmentStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get comments for a lesson
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return errorResponse('Lesson not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    // Get top-level comments
    const [comments, total] = await Promise.all([
      Comment.find({ lesson: id, parent: null })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ lesson: id, parent: null }),
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

// POST - Add comment to lesson
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, createCommentSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const lesson = await Lesson.findById(id);

    if (!lesson) {
      return errorResponse('Lesson not found', 404);
    }

    const module = await Module.findById(lesson.module);
    if (!module) {
      return errorResponse('Module not found', 404);
    }

    const course = await Course.findById(module.course);
    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check if user is enrolled (for paid courses)
    if (!course.isFree) {
      const enrollment = await Enrollment.findOne({
        user: request.user!.id,
        course: course._id,
        status: EnrollmentStatus.ACTIVE,
      });

      if (!enrollment) {
        return errorResponse('You must be enrolled to comment on this lesson', 403);
      }
    }

    const comment = await Comment.create({
      content: validation.data.content,
      lesson: id,
      user: request.user!.id,
      parent: validation.data.parent || null,
    });

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
