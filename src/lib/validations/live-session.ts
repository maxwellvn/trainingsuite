import { z } from 'zod';

export const createLiveSessionSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(300, 'Title cannot exceed 300 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional(),
  course: z.string().optional(),
  streamUrl: z.string().url('Invalid stream URL').optional(),
  streamProvider: z.enum(['youtube', 'vimeo', 'custom']).default('youtube'),
  scheduledAt: z.string().datetime('Invalid date format'),
  duration: z.number().int().min(1).optional(),
  thumbnail: z.string().url('Invalid thumbnail URL').optional(),
  maxAttendees: z.number().int().min(1).optional(),
});

export const updateLiveSessionSchema = createLiveSessionSchema.partial().extend({
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional(),
  recordingUrl: z.string().url('Invalid recording URL').optional(),
});

export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;
