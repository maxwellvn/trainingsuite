import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import Notification from '@/models/Notification';
import Course from '@/models/Course';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { CourseStatus, EnrollmentStatus, NotificationType, PaymentStatus } from '@/types';
import { findCourseByIdOrSlug } from '@/lib/utils/find-course';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Enroll in a course
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const course = await findCourseByIdOrSlug(id).populate('instructor', 'name');

    if (!course) {
      return errorResponse('Course not found', 404);
    }

    const courseId = course._id;

    // Check if course is available for enrollment (either isPublished flag or status is published)
    const isAvailable = course.isPublished || course.status === CourseStatus.PUBLISHED;
    if (!isAvailable) {
      return errorResponse('Course is not available for enrollment', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: courseId,
    });

    if (existingEnrollment) {
      return errorResponse('You are already enrolled in this course', 400);
    }

    // Check if course requires payment
    if (!course.isFree && course.price > 0) {
      // Check for completed payment
      const payment = await Payment.findOne({
        user: request.user!.id,
        course: courseId,
        status: PaymentStatus.COMPLETED,
      });

      if (!payment) {
        return errorResponse('Payment required. Please purchase this course first.', 402);
      }
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      user: request.user!.id,
      course: courseId,
      status: EnrollmentStatus.ACTIVE,
      progress: 0,
      completedLessons: [],
      startedAt: new Date(),
    });

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

    // Create notification
    await Notification.create({
      user: request.user!.id,
      type: NotificationType.COURSE_ENROLLED,
      title: 'Enrollment Successful',
      message: `You have successfully enrolled in "${course.title}"`,
      link: `/courses/${course.slug || courseId}`,
    });

    return successResponse(
      {
        enrollment: {
          _id: enrollment._id,
          course: courseId,
          status: enrollment.status,
          progress: enrollment.progress,
          startedAt: enrollment.startedAt,
        },
      },
      'Successfully enrolled in the course',
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}
