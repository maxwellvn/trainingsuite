import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Quiz from '@/models/Quiz';
import Question from '@/models/Question';
import { withInstructor, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateQuizSchema } from '@/lib/validations/quiz';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update quiz
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateQuizSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return errorResponse('Quiz not found', 404);
    }

    const lesson = await Lesson.findById(quiz.lesson);
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
      return errorResponse('Not authorized to update this quiz', 403);
    }

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { $set: validation.data },
      { new: true, runValidators: true }
    );

    return successResponse(updatedQuiz, 'Quiz updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete quiz
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return errorResponse('Quiz not found', 404);
    }

    const lesson = await Lesson.findById(quiz.lesson);
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
      return errorResponse('Not authorized to delete this quiz', 403);
    }

    // Delete questions
    await Question.deleteMany({ quiz: id });

    // Delete quiz
    await Quiz.findByIdAndDelete(id);

    return successResponse(null, 'Quiz deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withInstructor(request, (req) => deleteHandler(req, context));
}
