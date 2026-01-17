import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import LiveSession from '@/models/LiveSession';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';
import { PaymentStatus, EnrollmentStatus, LiveSessionStatus } from '@/types';

// GET - Dashboard overview stats
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers,
      totalCourses,
      publishedCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalRevenue,
      monthlyRevenue,
      upcomingSessions,
      liveSessions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: EnrollmentStatus.ACTIVE }),
      Enrollment.countDocuments({ status: EnrollmentStatus.COMPLETED }),
      Payment.aggregate([
        { $match: { status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: PaymentStatus.COMPLETED,
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      LiveSession.countDocuments({
        status: LiveSessionStatus.SCHEDULED,
        scheduledAt: { $gte: now },
      }),
      LiveSession.countDocuments({ status: LiveSessionStatus.LIVE }),
    ]);

    return successResponse({
      users: {
        total: totalUsers,
        newThisMonth: newUsers,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        thisMonth: monthlyRevenue[0]?.total || 0,
      },
      liveSessions: {
        upcoming: upcomingSessions,
        live: liveSessions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}
