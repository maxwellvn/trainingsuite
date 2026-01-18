import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Reorder lessons within a module
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: moduleId } = await params;
    const body = await request.json();
    const { lessonIds } = body;

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return errorResponse('lessonIds array is required', 400);
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
      return errorResponse('Not authorized to reorder lessons', 403);
    }

    // Update order for each lesson based on array position
    const updateOperations = lessonIds.map((lessonId: string, index: number) => ({
      updateOne: {
        filter: { _id: lessonId, module: moduleId },
        update: { $set: { order: index } },
      },
    }));

    await Lesson.bulkWrite(updateOperations);

    // Get updated lessons
    const updatedLessons = await Lesson.find({ module: moduleId }).sort({ order: 1 });

    return successResponse(updatedLessons, 'Lessons reordered successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => putHandler(req, context));
}
