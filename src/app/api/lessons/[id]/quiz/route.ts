import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import { withInstructor, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createQuizSchema, createQuestionSchema } from '@/lib/validations/quiz';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const createQuizWithQuestionsSchema = createQuizSchema.extend({
  questions: z.array(createQuestionSchema).optional(),
});

// GET - Get quiz for a lesson
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: lessonId } = await params;
    await connectDB();

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return errorResponse('Lesson not found', 404);
    }

    const module = await Module.findById(lesson.module);
    if (!module) {
      return errorResponse('Module not found', 404);
    }

    const course = await Course.findById(module.course);
    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const isOwner = request.user?.id === course.instructor.toString();
    const isAdmin = request.user?.role === UserRole.ADMIN;

    const quiz = await Quiz.findOne({ lesson: lessonId });

    if (!quiz) {
      return errorResponse('Quiz not found', 404);
    }

    if (!quiz.isPublished && !isOwner && !isAdmin) {
      return errorResponse('Quiz not found', 404);
    }

    const questions = await Question.find({ quiz: quiz._id }).sort({ order: 1 });

    // Hide correct answers for non-admin/instructor
    const questionsData = questions.map((q) => ({
      _id: q._id,
      question: q.question,
      options: q.options,
      points: q.points,
      order: q.order,
      ...(isOwner || isAdmin ? { correctAnswer: q.correctAnswer, explanation: q.explanation } : {}),
    }));

    return successResponse({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        passingScore: quiz.passingScore,
        timeLimit: quiz.timeLimit,
        isPublished: quiz.isPublished,
      },
      questions: questionsData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create quiz for a lesson
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id: lessonId } = await params;
    const validation = await validateBody(request, createQuizWithQuestionsSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return errorResponse('Lesson not found', 404);
    }

    const module = await Module.findById(lesson.module);
    if (!module) {
      return errorResponse('Module not found', 404);
    }

    const course = await Course.findById(module.course);
    if (!course) {
      return errorResponse('Course not found', 404);
    }

    // Check permission
    const isOwner = request.user!.id === course.instructor.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return errorResponse('Not authorized to create quiz for this lesson', 403);
    }

    // Check if quiz already exists
    const existingQuiz = await Quiz.findOne({ lesson: lessonId });
    if (existingQuiz) {
      return errorResponse('Quiz already exists for this lesson', 400);
    }

    const { questions, ...quizData } = validation.data;

    // Create quiz
    const quiz = await Quiz.create({
      ...quizData,
      lesson: lessonId,
    });

    // Create questions if provided
    if (questions && questions.length > 0) {
      const questionsWithQuiz = questions.map((q, index) => ({
        ...q,
        quiz: quiz._id,
        order: q.order ?? index,
      }));
      await Question.insertMany(questionsWithQuiz);
    }

    const createdQuestions = await Question.find({ quiz: quiz._id }).sort({ order: 1 });

    return successResponse(
      {
        quiz,
        questions: createdQuestions,
      },
      'Quiz created successfully',
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => postHandler(req, context));
}
