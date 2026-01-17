import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import QuizAttempt from '@/models/QuizAttempt';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { submitQuizSchema } from '@/lib/validations/quiz';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Submit quiz attempt
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, submitQuizSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return errorResponse('Quiz not found', 404);
    }

    if (!quiz.isPublished) {
      return errorResponse('Quiz is not available', 400);
    }

    // Get questions
    const questions = await Question.find({ quiz: id });

    if (questions.length === 0) {
      return errorResponse('Quiz has no questions', 400);
    }

    // Calculate score
    const { answers, timeTaken } = validation.data;
    let earnedPoints = 0;
    let totalPoints = 0;

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const gradedAnswers = answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (question) {
        totalPoints += question.points;
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        if (isCorrect) {
          earnedPoints += question.points;
        }
        return {
          questionId: question._id,
          selectedAnswer: answer.selectedAnswer,
          isCorrect,
          correctAnswer: question.correctAnswer,
        };
      }
      return {
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: false,
      };
    });

    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= quiz.passingScore;

    // Create attempt
    const attempt = await QuizAttempt.create({
      user: request.user!.id,
      quiz: id,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
      })),
      score,
      totalPoints,
      passed,
      timeTaken,
      completedAt: new Date(),
    });

    return successResponse({
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        totalPoints: attempt.totalPoints,
        passed: attempt.passed,
        timeTaken: attempt.timeTaken,
      },
      gradedAnswers,
      passingScore: quiz.passingScore,
    }, passed ? 'Congratulations! You passed the quiz.' : 'Quiz completed. Try again to improve your score.');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}
