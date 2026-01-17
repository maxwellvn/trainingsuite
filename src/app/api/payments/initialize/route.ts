import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import SiteConfig from '@/models/SiteConfig';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { initializePaymentSchema } from '@/lib/validations/payment';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { PaymentStatus } from '@/types';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

// POST - Initialize payment
async function postHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, initializePaymentSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { courseId: courseIdOrSlug, paymentMethod, currency } = validation.data;

    await connectDB();

    // Check site config for payment settings
    const config = await SiteConfig.findOne();
    if (!config?.enablePayments) {
      return errorResponse('Payments are currently disabled', 400);
    }

    const course = await findCourseByIdOrSlug(courseIdOrSlug);

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const courseId = course._id;

    if (!course.isPublished) {
      return errorResponse('Course is not available for purchase', 400);
    }

    if (course.isFree || course.price === 0) {
      return errorResponse('This course is free. Please enroll directly.', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: courseId,
    });

    if (existingEnrollment) {
      return errorResponse('You are already enrolled in this course', 400);
    }

    // Check for existing pending payment
    const existingPayment = await Payment.findOne({
      user: request.user!.id,
      course: courseId,
      status: PaymentStatus.PENDING,
    });

    if (existingPayment) {
      // Return existing payment reference
      return successResponse({
        paymentId: existingPayment._id,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        provider: existingPayment.provider,
        message: 'Payment already initialized',
      });
    }

    // Create payment record
    const payment = await Payment.create({
      user: request.user!.id,
      course: courseId,
      amount: course.price,
      currency: currency || 'USD',
      status: PaymentStatus.PENDING,
      paymentMethod,
      provider: config.defaultPaymentProvider || 'stripe',
    });

    // In a real implementation, you would:
    // 1. Initialize payment with Stripe/Paystack
    // 2. Return checkout URL or payment intent

    return successResponse(
      {
        paymentId: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        // checkoutUrl: 'https://checkout.stripe.com/...',
      },
      'Payment initialized',
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, postHandler);
}
