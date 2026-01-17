import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createModuleSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get modules for a course
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;
    await connectDB();

    const course = await Course.findById(courseId);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const isOwner = request.user?.id === course.instructor.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;

    if (!course.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Course not found', 404);
    }

    const modules = await Module.find({ course: courseId }).sort({ order: 1 });

    return successResponse(modules);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create module
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: courseId } = await params;
    const validation = await validateBody(request, createModuleSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const course = await Course.findById(courseId);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check permission
    const isOwner = request.user!.id === course.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to add modules to this course', 403);
    }

    // Get highest order number
    const lastModule = await Module.findOne({ course: courseId }).sort({ order: -1 });
    const order = validation.data.order ?? (lastModule ? lastModule.order + 1 : 0);

    const module = await Module.create({
      ...validation.data,
      course: courseId,
      order,
    });

    return successResponse(module, 'Module created successfully', 201);
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
