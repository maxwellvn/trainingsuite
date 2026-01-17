import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Rating from '@/models/Rating';
import { withAuth, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createRatingSchema } from '@/lib/validations/engagement';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to find course by ID or slug
// Helper to find course by ID or slug
function findCourseByIdOrSlug(idOrSlug: string) {
  const isValidObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);

  if (isValidObjectId) {
    return Course.findById(idOrSlug);
  }

  return Course.findOne({ slug: idOrSlug });
}

// GET - Get ratings for a course
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);

    const [ratings, total] = await Promise.all([
      Rating.find({ course: course._id })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Rating.countDocuments({ course: id }),
    ]);

    // Calculate rating stats
    const ratingStats = await Rating.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      average: course.rating,
      total: course.ratingCount,
      distribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      } as Record<number, number>,
    };

    ratingStats.forEach((s) => {
      stats.distribution[s._id] = s.count;
    });

    return paginatedResponse(ratings, { page, limit, total }, undefined);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Add or update rating
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, createRatingSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const course = await Course.findById(id);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: id,
    });

    if (!enrollment) {
      return errorResponse('You must be enrolled to rate this course', 403);
    }

    // Check for existing rating
    const existingRating = await Rating.findOne({
      user: request.user!.id,
      course: id,
    });

    let rating;
    let isNew = false;

    if (existingRating) {
      // Update existing rating
      rating = await Rating.findByIdAndUpdate(
        existingRating._id,
        { $set: validation.data },
        { new: true, runValidators: true }
      ).populate('user', 'name avatar');
    } else {
      // Create new rating
      rating = await Rating.create({
        ...validation.data,
        user: request.user!.id,
        course: id,
      });
      rating = await Rating.findById(rating._id).populate('user', 'name avatar');
      isNew = true;
    }

    // Recalculate course rating
    const ratingAgg = await Rating.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (ratingAgg.length > 0) {
      await Course.findByIdAndUpdate(id, {
        rating: Math.round(ratingAgg[0].avgRating * 10) / 10,
        ratingCount: ratingAgg[0].count,
      });
    }

    return successResponse(
      rating,
      isNew ? 'Rating added successfully' : 'Rating updated successfully',
      isNew ? 201 : 200
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}
