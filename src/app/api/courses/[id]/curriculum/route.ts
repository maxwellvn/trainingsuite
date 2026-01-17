import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { optionalAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to find course by ID or slug
// Helper to find course by ID or slug
function findCourseByIdOrSlug(idOrSlug: string) {
  const isValidObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);

  if (isValidObjectId) {
    return Course.findById(idOrSlug);
  }

  return Course.findOne({ slug: idOrSlug });
}

// GET - Get course curriculum (modules and lessons)
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check access for unpublished courses
    const isOwner = request.user?.id === course.instructor.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;
    const isInstructor = request.user?.role === UserRole.INSTRUCTOR;

    if (!course.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Course not found', 404);
    }

    // Get modules with their lessons
    const modules = await Module.find({ course: id }).sort({ order: 1 });

    const curriculum = await Promise.all(
      modules.map(async (module) => {
        const lessonQuery: Record<string, unknown> = { module: module._id };

        // Only show published lessons to regular users
        if (!isOwner && !isAdmin && !isInstructor) {
          lessonQuery.isPublished = true;
        }

        const lessonQueryBuilder = Lesson.find(lessonQuery).sort({ order: 1 });

        // Only exclude content for non-privileged users
        if (!isOwner && !isAdmin && !isInstructor) {
          lessonQueryBuilder.select('-content');
        }

        const lessons = await lessonQueryBuilder;

        return {
          _id: module._id,
          title: module.title,
          description: module.description,
          order: module.order,
          lessons: lessons.map((lesson) => ({
            _id: lesson._id,
            title: lesson.title,
            description: lesson.description,
            videoDuration: lesson.videoDuration,
            order: lesson.order,
            isFree: lesson.isFree,
            isPublished: lesson.isPublished,
            ...(isOwner || isAdmin || isInstructor ? { content: lesson.content, videoUrl: lesson.videoUrl } : {}),
          })),
        };
      })
    );

    return successResponse({
      course: {
        _id: course._id,
        title: course.title,
        duration: course.duration,
      },
      curriculum,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}
