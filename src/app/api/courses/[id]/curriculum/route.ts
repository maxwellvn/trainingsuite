import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { optionalAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole, CourseStatus } from '@/types';
import { findCourseByIdOrSlug, recalculateCourseDuration } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
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

    const courseId = course._id;

    // Check access for unpublished courses
    const isOwner = request.user?.id === course.instructor.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;
    const isInstructor = request.user?.role === UserRole.INSTRUCTOR;
    const isPublished = course.isPublished || course.status === CourseStatus.PUBLISHED;

    if (!isPublished && !isOwner && !isAdmin) {
      return errorResponse('Course not found', 404);
    }

    // Get modules with their lessons
    const modules = await Module.find({ course: courseId }).sort({ order: 1 });

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
            type: lesson.type || 'video',
            videoDuration: lesson.videoDuration,
            duration: lesson.videoDuration, // Include both for frontend compatibility
            order: lesson.order,
            isFree: lesson.isFree,
            isPublished: lesson.isPublished,
            ...(isOwner || isAdmin || isInstructor ? { content: lesson.content, videoUrl: lesson.videoUrl } : {}),
          })),
        };
      })
    );

    // Calculate total duration from lessons
    const calculatedDuration = curriculum.reduce(
      (acc, module) =>
        acc + module.lessons.reduce((lessonAcc, lesson) => lessonAcc + (lesson.videoDuration || 0), 0),
      0
    );

    // Auto-recalculate if stored duration doesn't match calculated duration
    let courseDuration = course.duration;
    if (calculatedDuration !== course.duration) {
      courseDuration = await recalculateCourseDuration(course._id);
    }

    return successResponse({
      course: {
        _id: course._id,
        title: course.title,
        duration: courseDuration,
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
