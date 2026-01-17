import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import Course from '@/models/Course';
import { successResponse, handleApiError } from '@/lib/utils/api-response';

// GET - Get all instructors (public endpoint)
// Returns users who have created at least one course
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get distinct instructor IDs from courses
    const instructorIds = await Course.distinct('instructor');

    // Fetch user details for these instructors
    const instructors = await User.find({ _id: { $in: instructorIds } })
      .select('name avatar bio createdAt title')
      .sort({ createdAt: -1 });

    return successResponse(instructors);
  } catch (error) {
    return handleApiError(error);
  }
}
