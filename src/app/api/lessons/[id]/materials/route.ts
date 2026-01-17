import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Material from '@/models/Material';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { uploadFile, deleteFile } from '@/lib/utils/file-upload';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get materials for a lesson
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: lessonId } = await params;
    await connectDB();

    const lesson = await Lesson.findById(lessonId);

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

    if (!lesson.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Lesson not found', 404);
    }

    const materials = await Material.find({ lesson: lessonId });

    return successResponse(materials);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Add material to lesson (supports file upload via FormData)
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: lessonId } = await params;
    await connectDB();

    const lesson = await Lesson.findById(lessonId);

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
      return errorResponse('Not authorized to add materials to this lesson', 403);
    }

    const contentType = request.headers.get('content-type') || '';

    let materialData: { title: string; fileUrl: string; fileType: string; fileSize?: number };

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') as string | null;

      if (!file) {
        return errorResponse('File is required', 400);
      }

      if (!title) {
        return errorResponse('Title is required', 400);
      }

      const uploadResult = await uploadFile(file, 'materials');

      if (!uploadResult.success) {
        return errorResponse(uploadResult.error, 400);
      }

      materialData = {
        title,
        fileUrl: uploadResult.fileUrl,
        fileType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      };
    } else {
      // Handle JSON body (for external URLs)
      const body = await request.json();

      if (!body.title || !body.fileUrl) {
        return errorResponse('Title and fileUrl are required', 400);
      }

      materialData = {
        title: body.title,
        fileUrl: body.fileUrl,
        fileType: body.fileType || 'application/octet-stream',
        fileSize: body.fileSize,
      };
    }

    const material = await Material.create({
      ...materialData,
      lesson: lessonId,
    });

    return successResponse(material, 'Material added successfully', 201);
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
