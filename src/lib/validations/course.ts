import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  icon: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  category: z.string().min(1, 'Category is required'),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
  previewVideo: z.string().url('Invalid preview video URL').optional(),
  price: z.number().min(0, 'Price cannot be negative').default(0),
  isFree: z.boolean().default(true),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  requirements: z.array(z.string()).optional(),
  objectives: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  isPublished: z.boolean().optional(),
});

export const createModuleSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

export const reorderModulesSchema = z.object({
  modules: z.array(z.object({
    id: z.string(),
    order: z.number().int().min(0),
  })),
});

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional(),
  content: z
    .string()
    .max(50000, 'Content cannot exceed 50000 characters')
    .optional(),
  type: z.enum(['video', 'text']).default('video'),
  videoUrl: z.string().url('Invalid video URL').optional(),
  videoDuration: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
  isFree: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

export const updateLessonSchema = createLessonSchema.partial();

export const createMaterialSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  fileUrl: z.string().url('Invalid file URL'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().int().min(0, 'File size must be positive'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
