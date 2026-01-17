import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Enrollment from '@/models/Enrollment';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateLessonSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole, EnrollmentStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get lesson by ID
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const isOwner = request.user?.id === course.instructor.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;

    // Check if lesson is accessible
    if (!lesson.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Lesson not found', 404);
    }

    // Check if user has access to paid content
    if (!lesson.isFree && !course.isFree && !isOwner && !isAdmin) {
      // Check enrollment
      const enrollment = await Enrollment.findOne({
        user: request.user?.id,
        course: course._id,
        status: EnrollmentStatus.ACTIVE,
      });

      if (!enrollment) {
        return successResponse({
          _id: lesson._id,
          title: lesson.title,
          description: lesson.description,
          videoDuration: lesson.videoDuration,
          isFree: lesson.isFree,
          requiresEnrollment: true,
        });
      }
    }

    return successResponse(lesson);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update lesson
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateLessonSchema);
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

    // Check permission
    const isOwner = request.user!.id === course.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to update this lesson', 403);
    }

    // Update course duration if video duration changed
    if (validation.data.videoDuration !== undefined && validation.data.videoDuration !== lesson.videoDuration) {
      const durationDiff = validation.data.videoDuration - (lesson.videoDuration || 0);
      await Course.findByIdAndUpdate(course._id, {
        $inc: { duration: durationDiff },
      });
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    );

    return successResponse(updatedLesson, 'Lesson updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete lesson
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Check permission
    const isOwner = request.user!.id === course.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to delete this lesson', 403);
    }

    // Update course duration
    if (lesson.videoDuration) {
      await Course.findByIdAndUpdate(course._id, {
        $inc: { duration: -lesson.videoDuration },
      });
    }

    await Lesson.findByIdAndDelete(id);

    return successResponse(null, 'Lesson deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => deleteHandler(req, context));
}
