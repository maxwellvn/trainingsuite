import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Certificate from '@/models/Certificate';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ number: string }>;
}

// GET - Verify certificate by certificate number (public endpoint)
async function getHandler(request: NextRequest, { params }: RouteParams) {
  try {
    const { number } = await params;
    await connectDB();

    const certificate = await Certificate.findOne({ certificateNumber: number })
      .populate({
        path: 'course',
        select: 'title slug thumbnail',
      })
      .populate('user', 'name');

    if (!certificate) {
      return errorResponse('Certificate not found. This certificate number is not valid.', 404);
    }

    // Return public certificate details for verification
    return successResponse({
      isValid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        issuedAt: certificate.issuedAt,
        recipientName: certificate.user.name,
        courseName: certificate.course.title,
        courseSlug: certificate.course.slug,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return getHandler(request, context);
}
