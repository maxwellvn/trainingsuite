import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import Course from '@/models/Course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get instructor by ID (public endpoint)
// Returns user profile for anyone who has created courses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid instructor ID', 400);
    }

    // Find user
    const user = await User.findById(id).select('name avatar bio createdAt title');

    if (!user) {
      return errorResponse('Instructor not found', 404);
    }

    // Check if user has any courses (is an instructor)
    const courseCount = await Course.countDocuments({ instructor: id });

    if (courseCount === 0) {
      // User exists but isn't an instructor of any course
      return errorResponse('Instructor not found', 404);
    }

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
