import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Payment from '@/models/Payment';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get payment details
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const payment = await Payment.findById(id)
      .populate({
        path: 'course',
        select: 'title slug thumbnail instructor',
        populate: {
          path: 'instructor',
          select: 'name',
        },
      })
      .populate('user', 'name email');

    if (!payment) {
      return errorResponse('Payment not found', 404);
    }

    // Check permission (owner or admin)
    const isOwner = request.user!.id === payment.user._id.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to view this payment', 403);
    }

    return successResponse(payment);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
