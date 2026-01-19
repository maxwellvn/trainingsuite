import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import '@/models/Category'; // Required for populate
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createCourseSchema } from '@/lib/validations/course';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams, getSortParams } from '@/lib/utils/pagination';
import { createSlug } from '@/lib/utils/slugify';
import { CourseStatus } from '@/types';

// GET - List courses with filters
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sort = getSortParams(
      searchParams,
      ['createdAt', 'title', 'price', 'rating', 'enrollmentCount'],
      '-createdAt'
    );

    // Build query
    const query: Record<string, unknown> = {};

    // Only show published courses to non-admin/instructor
    const isPrivileged = request.user?.role === 'admin' || request.user?.role === 'instructor';
    if (!isPrivileged) {
      // Show courses that are published (isPublished=true OR status='published')
      query.$or = [
        { isPublished: true },
        { status: CourseStatus.PUBLISHED }
      ];
    }

    // Filters
    const category = searchParams.get('category');
    if (category) query.category = category;

    const instructor = searchParams.get('instructor');
    if (instructor) query.instructor = instructor;

    const level = searchParams.get('level');
    if (level) query.level = level;

    const isFree = searchParams.get('isFree');
    if (isFree !== null) query.isFree = isFree === 'true';

    const status = searchParams.get('status');
    if (status && isPrivileged) query.status = status;

    // Text search
    const search = searchParams.get('search');
    if (search) {
      query.$text = { $search: search };
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('instructor', 'name avatar')
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Course.countDocuments(query),
    ]);

    return paginatedResponse(courses, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create course (admin/instructor only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, createCourseSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const slug = createSlug(validation.data.title, true);

    const course = await Course.create({
      ...validation.data,
      slug,
      instructor: request.user!.id,
      status: CourseStatus.DRAFT,
    });

    const populatedCourse = await Course.findById(course._id)
      .populate('instructor', 'name avatar')
      .populate('category', 'name slug');

    return successResponse(populatedCourse, 'Course created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return optionalAuth(request, getHandler);
}

export async function POST(request: NextRequest) {
  return withInstructor(request, postHandler);
}
