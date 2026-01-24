import { z } from 'zod';

// Custom datetime validation that accepts both ISO 8601 and datetime-local formats
const dateTimeSchema = z.string().refine(
  (val) => {
    // Try parsing as a date
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Invalid date format' }
);

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
  streamUrl: z.string().url('Invalid stream URL').optional().or(z.literal('')),
  streamProvider: z.enum(['youtube', 'vimeo', 'hls', 'custom']).default('youtube'),
  scheduledAt: dateTimeSchema,
  duration: z.number().int().min(1).optional(),
  thumbnail: z.string().url('Invalid thumbnail URL').optional().or(z.literal('')),
  maxAttendees: z.number().int().min(1).optional(),
});

export const updateLiveSessionSchema = createLiveSessionSchema.partial().extend({
  status: z.enum(['scheduled', 'live', 'ended', 'cancelled']).optional(),
  recordingUrl: z.string().url('Invalid recording URL').optional(),
});

export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;
