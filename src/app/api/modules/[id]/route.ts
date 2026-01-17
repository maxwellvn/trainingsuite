import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateModuleSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update module
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateModuleSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const module = await Module.findById(id);

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
      return errorResponse('Not authorized to update this module', 403);
    }

    const updatedModule = await Module.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    );

    return successResponse(updatedModule, 'Module updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete module
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const module = await Module.findById(id);

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
      return errorResponse('Not authorized to delete this module', 403);
    }

    // Delete all lessons in this module
    await Lesson.deleteMany({ module: id });

    // Delete module
    await Module.findByIdAndDelete(id);

    return successResponse(null, 'Module and its lessons deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => deleteHandler(req, context));
}
