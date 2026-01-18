import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Module from '@/models/Module';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Reorder modules for a course
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { moduleIds } = body;

    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      return errorResponse('moduleIds array is required', 400);
    }

    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check permission
    const isOwner = request.user!.id === course.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to reorder modules', 403);
    }

    // Update order for each module based on array position
    const updateOperations = moduleIds.map((moduleId: string, index: number) => ({
      updateOne: {
        filter: { _id: moduleId, course: course._id },
        update: { $set: { order: index } },
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

export async function PUT(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => putHandler(req, context));
}
