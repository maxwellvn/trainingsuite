import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db/connect';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Enrollment from '@/models/Enrollment';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get course progress for current user
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const courseId = course._id;

    const enrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: courseId,
    });

    if (!enrollment) {
      return errorResponse('Not enrolled in this course', 404);
    }

    // Get all modules and lessons
    const modules = await Module.find({ course: courseId }).sort({ order: 1 });
    const moduleIds = modules.map((m) => m._id);
    const lessons = await Lesson.find({
      module: { $in: moduleIds },
      isPublished: true,
    }).sort({ order: 1 });

    // Create progress map
    const completedLessonsSet = new Set(
      enrollment.completedLessons.map((l: Types.ObjectId) => l.toString())
    );

    const moduleProgress = modules.map((module) => {
      const moduleLessons = lessons.filter(
        (l) => l.module.toString() === module._id.toString()
      );
      const completedCount = moduleLessons.filter((l) =>
        completedLessonsSet.has(l._id.toString())
      ).length;

      return {
        _id: module._id,
        title: module.title,
        totalLessons: moduleLessons.length,
        completedLessons: completedCount,
        progress: moduleLessons.length > 0
          ? Math.round((completedCount / moduleLessons.length) * 100)
          : 0,
        lessons: moduleLessons.map((l) => ({
          _id: l._id,
          title: l.title,
          isCompleted: completedLessonsSet.has(l._id.toString()),
        })),
      };
    });

    return successResponse({
      enrollment: {
        _id: enrollment._id,
        status: enrollment.status,
        progress: enrollment.progress,
        startedAt: enrollment.startedAt,
        completedAt: enrollment.completedAt,
      },
      totalLessons: lessons.length,
      completedLessons: enrollment.completedLessons.length,
      moduleProgress,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
