import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import '@/models/Category'; // Required for populate
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateCourseSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { createSlug } from '@/lib/utils/slugify';
import { CourseStatus, UserRole } from '@/types';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get course by ID or slug
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id)
      .populate('instructor', 'name avatar bio')
      .populate('category', 'name slug');

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check access for unpublished courses
    const isOwner = request.user?.id === course.instructor._id.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;

    if (!course.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Course not found', 404);
    }

    return successResponse(course);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update course
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateCourseSchema);
    if (!validation.success) {
      return validation.response;
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
      return errorResponse('Not authorized to update this course', 403);
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    // Update slug if title changes
    if (validation.data.title && validation.data.title !== course.title) {
      updateData.slug = createSlug(validation.data.title, true);
    }

    // Set publishedAt if publishing
    if (validation.data.isPublished && !course.isPublished) {
      updateData.publishedAt = new Date();
      updateData.status = CourseStatus.PUBLISHED;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      course._id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('instructor', 'name avatar')
      .populate('category', 'name slug');

    return successResponse(updatedCourse, 'Course updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete course
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Only admin can delete
    if (request.user!.role !== UserRole.ADMIN) {
      return errorResponse('Only admins can delete courses', 403);
    }

    await Course.findByIdAndDelete(course._id);

    return successResponse(null, 'Course deleted successfully');
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
