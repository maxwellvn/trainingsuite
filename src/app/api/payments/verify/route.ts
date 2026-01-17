import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import Notification from '@/models/Notification';
import { validateBody } from '@/middleware/validate';
import { verifyPaymentSchema } from '@/lib/validations/payment';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { PaymentStatus, EnrollmentStatus, NotificationType } from '@/types';

// POST - Verify payment (webhook)
export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, verifyPaymentSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { transactionId, provider } = validation.data;

    await connectDB();

    // In a real implementation, verify with Stripe/Paystack API
    // For now, we'll simulate a successful verification

    // Find payment by transaction ID or create from webhook data
    let payment = await Payment.findOne({ transactionId });

    if (!payment) {
      // Try to find by pending status and update
      // This is a simplified version - real implementation would verify with provider
      return errorResponse('Payment not found', 404);
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return successResponse({ message: 'Payment already verified' });
    }

    // Update payment status
    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = transactionId;
    await payment.save();

    // Create enrollment
    const existingEnrollment = await Enrollment.findOne({
      user: payment.user,
      course: payment.course,
    });

    if (!existingEnrollment) {
      await Enrollment.create({
        user: payment.user,
        course: payment.course,
        status: EnrollmentStatus.ACTIVE,
        progress: 0,
        completedLessons: [],
        startedAt: new Date(),
      });

      // Update course enrollment count
      await Course.findByIdAndUpdate(payment.course, {
        $inc: { enrollmentCount: 1 },
      });

      const course = await Course.findById(payment.course);

      // Create notification
      await Notification.create({
        user: payment.user,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful',
        message: `You've successfully purchased "${course?.title}"`,
        link: `/courses/${payment.course}`,
      });
    }

    return successResponse({ message: 'Payment verified and enrollment created' });
  } catch (error) {
    return handleApiError(error);
  }
}
