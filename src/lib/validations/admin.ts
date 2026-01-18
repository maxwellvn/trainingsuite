import { z } from 'zod';

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'instructor', 'user']),
});

export const updateSiteConfigSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  logo: z.string().url('Invalid logo URL').optional().nullable(),
  favicon: z.string().url('Invalid favicon URL').optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  enablePayments: z.boolean().optional(),
  defaultPaymentProvider: z.enum(['stripe', 'paystack']).optional(),
  enableLiveStreaming: z.boolean().optional(),
  defaultStreamProvider: z.enum(['youtube', 'vimeo', 'custom']).optional(),
  enableForums: z.boolean().optional(),
  enableComments: z.boolean().optional(),
  enableRatings: z.boolean().optional(),
  enableCertificates: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  contactEmail: z.string().email('Invalid email').optional().nullable(),
  socialLinks: z.object({
    facebook: z.string().url().optional().nullable(),
    twitter: z.string().url().optional().nullable(),
    instagram: z.string().url().optional().nullable(),
    youtube: z.string().url().optional().nullable(),
  }).optional(),
});

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content cannot exceed 5000 characters'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateSiteConfigInput = z.infer<typeof updateSiteConfigSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
