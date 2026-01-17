import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createLessonSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get lessons for a module
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: moduleId } = await params;
    await connectDB();

    const module = await Module.findById(moduleId);

    if (!module) {
      return errorResponse('Module not found', 404);
    }

    const course = await Course.findById(module.course);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const isOwner = request.user?.id === course.instructor.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;

    if (!course.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Module not found', 404);
    }

    const lessonQuery: Record<string, unknown> = { module: moduleId };

    // Only show published lessons to regular users
    if (!isOwner && !isAdmin) {
      lessonQuery.isPublished = true;
    }

    const lessons = await Lesson.find(lessonQuery).sort({ order: 1 });

    return successResponse(lessons);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create lesson
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: moduleId } = await params;
    const validation = await validateBody(request, createLessonSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const module = await Module.findById(moduleId);

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
      return errorResponse('Not authorized to add lessons to this module', 403);
    }

    // Get highest order number
    const lastLesson = await Lesson.findOne({ module: moduleId }).sort({ order: -1 });
    const order = validation.data.order ?? (lastLesson ? lastLesson.order + 1 : 0);

    const lesson = await Lesson.create({
      ...validation.data,
      module: moduleId,
      order,
    });

    // Update course duration if lesson has video duration
    if (validation.data.videoDuration) {
      await Course.findByIdAndUpdate(course._id, {
        $inc: { duration: validation.data.videoDuration },
      });
    }

    return successResponse(lesson, 'Lesson created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => postHandler(req, context));
}
