import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Payment from '@/models/Payment';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

// GET - Get user's payment history
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const status = searchParams.get('status');

    const query: Record<string, unknown> = { user: request.user!.id };
    if (status) query.status = status;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate({
          path: 'course',
          select: 'title slug thumbnail',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query),
    ]);

    return paginatedResponse(payments, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAuth(request, getHandler);
}
