import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { reorderModulesSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

// PUT - Reorder modules
async function putHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, reorderModulesSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const { modules } = validation.data;

    if (modules.length === 0) {
      return errorResponse('No modules to reorder', 400);
    }

    // Get the first module to check course ownership
    const firstModule = await Module.findById(modules[0].id);

    if (!firstModule) {
      return errorResponse('Module not found', 404);
    }

    const course = await Course.findById(firstModule.course);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check permission
    const isOwner = request.user!.id === course.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to reorder modules', 403);
    }

    // Update order for each module
    const updateOperations = modules.map((m) => ({
      updateOne: {
        filter: { _id: m.id, course: course._id },
        update: { $set: { order: m.order } },
      },
    }));

    await Module.bulkWrite(updateOperations);

    // Get updated modules
    const updatedModules = await Module.find({ course: course._id }).sort({ order: 1 });

    return successResponse(updatedModules, 'Modules reordered successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  return withInstructor(request, putHandler);
}
