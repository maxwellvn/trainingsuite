import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';
import { recalculateCourseDuration } from '@/lib/utils/find-course';

// POST - Recalculate durations for all courses
async function postHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    // Get all courses
    const courses = await Course.find({});

    const results = [];

    for (const course of courses) {
      const duration = await recalculateCourseDuration(course._id);
      results.push({
        courseId: course._id,
        title: course.title,
        newDuration: duration,
      });
    }

    return successResponse({
      message: `Recalculated durations for ${results.length} courses`,
      results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  return withAdmin(request, postHandler);
}
