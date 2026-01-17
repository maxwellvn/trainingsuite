import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Payment from '@/models/Payment';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, handleApiError } from '@/lib/utils/api-response';
import { PaymentStatus } from '@/types';

// GET - Revenue analytics
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue over time
    const revenueByDay = await Payment.aggregate([
      {
        $match: {
          status: PaymentStatus.COMPLETED,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue by course
    const revenueByCourse = await Payment.aggregate([
      {
        $match: {
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: '$course',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
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
          revenue: 1,
          transactions: '$count',
        },
      },
    ]);

    // Revenue by payment provider
    const revenueByProvider = await Payment.aggregate([
      {
        $match: {
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: '$provider',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Total stats
    const totalStats = await Payment.aggregate([
      {
        $match: {
          status: PaymentStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransactionValue: { $avg: '$amount' },
        },
      },
    ]);

    return successResponse({
      revenueByDay,
      revenueByCourse,
      revenueByProvider,
      totals: totalStats[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        avgTransactionValue: 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}
