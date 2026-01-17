import { z } from 'zod';

export const initializePaymentSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
});

export const verifyPaymentSchema = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
  provider: z.enum(['stripe', 'paystack']),
});

export const updatePaymentConfigSchema = z.object({
  enablePayments: z.boolean().optional(),
  defaultPaymentProvider: z.enum(['stripe', 'paystack']).optional(),
  stripeSecretKey: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  paystackSecretKey: z.string().optional(),
  paystackPublicKey: z.string().optional(),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type UpdatePaymentConfigInput = z.infer<typeof updatePaymentConfigSchema>;
