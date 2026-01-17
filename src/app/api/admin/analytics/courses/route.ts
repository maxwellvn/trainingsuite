import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';

// GET - Course analytics
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    // Course stats
    const courseStats = await Course.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Courses by category
    const coursesByCategory = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          name: '$category.name',
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Top rated courses
    const topRatedCourses = await Course.find({ ratingCount: { $gte: 5 } })
      .sort({ rating: -1 })
      .limit(10)
      .select('title slug rating ratingCount enrollmentCount');

    // Most enrolled courses
    const mostEnrolledCourses = await Course.find({ isPublished: true })
      .sort({ enrollmentCount: -1 })
      .limit(10)
      .select('title slug enrollmentCount rating');

    // Course completion rates
    const completionRates = await Enrollment.aggregate([
      {
        $group: {
          _id: '$course',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          completionRate: {
            $multiply: [{ $divide: ['$completed', '$total'] }, 100],
          },
          total: 1,
          completed: 1,
        },
      },
      { $sort: { completionRate: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $project: {
          _id: 0,
          courseId: '$_id',
          title: '$course.title',
          completionRate: { $round: ['$completionRate', 1] },
          totalEnrollments: '$total',
          completedEnrollments: '$completed',
        },
      },
    ]);

    return successResponse({
      courseStats,
      coursesByCategory,
      topRatedCourses,
      mostEnrolledCourses,
      completionRates,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}
