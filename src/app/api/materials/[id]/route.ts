import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Material from '@/models/Material';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { deleteFile } from '@/lib/utils/file-upload';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Delete material
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const material = await Material.findById(id);

    if (!material) {
      return errorResponse('Material not found', 404);
    }

    const lesson = await Lesson.findById(material.lesson);
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
      return errorResponse('Not authorized to delete this material', 403);
    }

    // Delete local file if it's a local upload
    if (material.fileUrl && material.fileUrl.startsWith('/uploads/')) {
      await deleteFile(material.fileUrl);
    }

    await Material.findByIdAndDelete(id);

    return successResponse(null, 'Material deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => deleteHandler(req, context));
}
