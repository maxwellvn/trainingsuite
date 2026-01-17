import { z } from 'zod';

export const createQuizSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  passingScore: z.number().int().min(0).max(100).default(70),
  timeLimit: z.number().int().min(1).optional(),
  isPublished: z.boolean().default(false),
});

export const updateQuizSchema = createQuizSchema.partial();

// Base schema without refinement for partial updates
const questionBaseSchema = z.object({
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(1000, 'Question cannot exceed 1000 characters'),
  options: z
    .array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'At least 2 options are required')
    .max(6, 'Maximum 6 options allowed'),
  correctAnswer: z.number().int().min(0),
  points: z.number().int().min(1).default(1),
  explanation: z
    .string()
    .max(500, 'Explanation cannot exceed 500 characters')
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const createQuestionSchema = questionBaseSchema.refine(
  (data) => data.correctAnswer < data.options.length,
  {
    message: 'Correct answer index must be within options range',
    path: ['correctAnswer'],
  }
);

export const updateQuestionSchema = questionBaseSchema.partial();

export const submitQuizSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().min(1, 'Question ID is required'),
    selectedAnswer: z.number().int().min(0),
  })),
  timeTaken: z.number().int().min(0),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;
