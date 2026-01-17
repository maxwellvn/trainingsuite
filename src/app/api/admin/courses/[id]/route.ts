import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateCourseSchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { createSlug } from '@/lib/utils/slugify';
import { CourseStatus } from '@/types';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get course by ID (admin)
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id)
      .populate('instructor', 'name avatar bio email')
      .populate('category', 'name slug');

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    return successResponse(course);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update course (admin)
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

    // Handle status changes
    if (validation.data.status) {
      if (validation.data.status === CourseStatus.PUBLISHED && !course.isPublished) {
        updateData.isPublished = true;
        updateData.publishedAt = new Date();
      } else if (validation.data.status === CourseStatus.ARCHIVED) {
        updateData.isPublished = false;
      }
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

// DELETE - Delete course (admin only)
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    await Course.findByIdAndDelete(course._id);

    return successResponse(null, 'Course deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => deleteHandler(req, context));
}
