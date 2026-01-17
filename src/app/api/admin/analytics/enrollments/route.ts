import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Enrollment from '@/models/Enrollment';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';

// GET - Enrollment analytics
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Enrollments over time
    const enrollmentsByDay = await Enrollment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Enrollments by status
    const enrollmentsByStatus = await Enrollment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Top courses by enrollment
    const topCourses = await Enrollment.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
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
          enrollments: '$count',
        },
      },
    ]);

    // Completion rate
    const completionStats = await Enrollment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);

    const completionRate = completionStats[0]
      ? Math.round((completionStats[0].completed / completionStats[0].total) * 100)
      : 0;

    return successResponse({
      enrollmentsByDay,
      enrollmentsByStatus,
      topCourses,
      completionRate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}
