import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Rating from '@/models/Rating';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Delete rating
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const rating = await Rating.findById(id);

    if (!rating) {
      return errorResponse('Rating not found', 404);
    }

    // Check permission (owner or admin)
    const isOwner = request.user!.id === rating.user.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to delete this rating', 403);
    }

    const courseId = rating.course;

    await Rating.findByIdAndDelete(id);

    // Recalculate course rating
    const ratingAgg = await Rating.aggregate([
      { $match: { course: courseId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (ratingAgg.length > 0) {
      await Course.findByIdAndUpdate(courseId, {
        rating: Math.round(ratingAgg[0].avgRating * 10) / 10,
        ratingCount: ratingAgg[0].count,
      });
    } else {
      await Course.findByIdAndUpdate(courseId, {
        rating: 0,
        ratingCount: 0,
      });
    }

    return successResponse(null, 'Rating deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => deleteHandler(req, context));
}
