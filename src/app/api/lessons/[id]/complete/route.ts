import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';
import Enrollment from '@/models/Enrollment';
import Certificate from '@/models/Certificate';
import Notification from '@/models/Notification';
import Course from '@/models/Course';
import User from '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { EnrollmentStatus, NotificationType, UserRole } from '@/types';
import { generateCertificatePDF } from '@/lib/utils/certificate-generator';
import { generateCertificateNumber } from '@/lib/utils/slugify';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Mark lesson as complete
async function postHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    // Validate lesson ID format
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return errorResponse('Invalid lesson ID format', 400);
    }

    const lesson = await Lesson.findById(id);

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

    // Check enrollment (allow both ACTIVE and COMPLETED enrollments to complete new lessons)
    let enrollment = await Enrollment.findOne({
      user: request.user!.id,
      course: course._id,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    });

    // Auto-enroll admins if not enrolled
    if (!enrollment && request.user!.role === UserRole.ADMIN) {
      enrollment = await Enrollment.create({
        user: request.user!.id,
        course: course._id,
        status: EnrollmentStatus.ACTIVE,
        progress: 0,
        completedLessons: [],
      });
    }

    if (!enrollment) {
      return errorResponse('You must be enrolled in this course to track progress', 403);
    }

    // If enrollment was COMPLETED, revert to ACTIVE since there's new content to complete
    const wasCompleted = enrollment.status === EnrollmentStatus.COMPLETED;
    if (wasCompleted) {
      enrollment.status = EnrollmentStatus.ACTIVE;
      enrollment.completedAt = undefined;
    }

    // Check if lesson is already completed
    if (enrollment.completedLessons.includes(lesson._id)) {
      return successResponse({
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons.length,
      }, 'Lesson already completed');
    }

    // Get total lessons count for the course (count all lessons regardless of publish status
    // since admins/instructors can complete unpublished lessons)
    const modules = await Module.find({ course: course._id });
    const moduleIds = modules.map((m) => m._id);
    const totalLessons = await Lesson.countDocuments({
      module: { $in: moduleIds },
    });

    // Add lesson to completed
    enrollment.completedLessons.push(lesson._id);

    // Calculate new progress (avoid division by zero)
    const completedCount = enrollment.completedLessons.length;
    enrollment.progress = totalLessons > 0
      ? Math.min(100, Math.round((completedCount / totalLessons) * 100))
      : 100;

    // Check if course is completed
    let certificateIssued = false;
    if (enrollment.progress >= 100) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();

      // Issue certificate
      const existingCertificate = await Certificate.findOne({
        user: request.user!.id,
        course: course._id,
      });

      if (!existingCertificate) {
        // Get user and instructor details for certificate
        const user = await User.findById(request.user!.id);
        const instructor = await User.findById(course.instructor);

        const certificateNumber = generateCertificateNumber();

        // Generate PDF certificate
        console.log('Generating certificate for user:', request.user!.id, 'course:', course._id);
        const pdfResult = await generateCertificatePDF({
          userName: user?.name || 'Student',
          courseName: course.title,
          completionDate: new Date(),
          certificateNumber,
          instructorName: instructor?.name,
        });

        if (!pdfResult.success) {
          console.error('Failed to generate certificate PDF:', pdfResult.error);
          // Still create the certificate record even if PDF generation failed
          // The download route will handle generating it on-the-fly
        } else {
          console.log('Certificate PDF generated successfully:', pdfResult.certificateUrl);
        }

        const certificate = await Certificate.create({
          user: request.user!.id,
          course: course._id,
          certificateNumber,
          certificateUrl: pdfResult.success ? pdfResult.certificateUrl : undefined,
          issuedAt: new Date(),
        });

        certificateIssued = true;

        // Create notification for certificate
        await Notification.create({
          user: request.user!.id,
          type: NotificationType.CERTIFICATE_ISSUED,
          title: 'Certificate Issued',
          message: `Congratulations! You've earned a certificate for completing "${course.title}"`,
          link: `/certificates/${certificate._id}`,
        });
      }

      // Create notification for course completion
      await Notification.create({
        user: request.user!.id,
        type: NotificationType.COURSE_COMPLETED,
        title: 'Course Completed',
        message: `Congratulations! You've completed "${course.title}"`,
        link: `/courses/${course._id}`,
      });
    }

    await enrollment.save();

    return successResponse({
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons.length,
      totalLessons,
      isCompleted: enrollment.status === EnrollmentStatus.COMPLETED,
      certificateIssued,
    }, 'Lesson marked as complete');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => postHandler(req, context));
}
