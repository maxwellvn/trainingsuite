import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Quiz from '@/models/Quiz';
import QuizAttempt from '@/models/QuizAttempt';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get user's quiz attempts
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return errorResponse('Quiz not found', 404);
    }

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams, 10);

    const query = {
      user: request.user!.id,
      quiz: id,
    };

    const [attempts, total] = await Promise.all([
      QuizAttempt.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      QuizAttempt.countDocuments(query),
    ]);

    return paginatedResponse(attempts, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
