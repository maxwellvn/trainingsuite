import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Certificate from '@/models/Certificate';
import '@/models/Course';
import '@/models/User';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { errorResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';
import { generateCertificatePDFBuffer } from '@/lib/utils/certificate-generator';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Download certificate PDF
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    console.log('[Certificate Download] Request for ID:', id);

    const certificate = await Certificate.findById(id)
      .populate({
        path: 'course',
        select: 'title instructor',
      })
      .populate('user', 'name');

    if (!certificate) {
      console.error('[Certificate Download] Certificate not found for ID:', id);
      return errorResponse('Certificate not found', 404);
    }

    console.log('[Certificate Download] Certificate found:', certificate._id, 'URL:', certificate.certificateUrl);

    // Only owner or admin can download
    const isOwner = request.user!.id === certificate.user._id.toString();
    const isAdmin = request.user!.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      console.error('[Certificate Download] User not authorized');
      return errorResponse('Not authorized to download this certificate', 403);
    }

    // If certificate has a URL, try to read file
    if (certificate.certificateUrl) {
      console.log('[Certificate Download] Attempting to read existing file from URL:', certificate.certificateUrl);
      
      // Extract filename from URL (handle both absolute and relative URLs)
      let fileName: string;
      try {
        const urlObj = new URL(certificate.certificateUrl);
        const pathname = urlObj.pathname;
        const pathParts = pathname.split('/');
        fileName = pathParts[pathParts.length - 1];
      } catch {
        // If URL parsing fails, treat it as a path
        const pathParts = certificate.certificateUrl.split('/');
        fileName = pathParts[pathParts.length - 1];
      }
      
      console.log('[Certificate Download] Extracted filename:', fileName);
      
      // Construct file path
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'certificates', fileName);
      console.log('[Certificate Download] File path:', filePath);
      
      // Check if file exists
      try {
        await access(filePath, constants.F_OK);
        console.log('[Certificate Download] File exists, reading...');
        const pdfBuffer = await readFile(filePath);
        console.log('[Certificate Download] Successfully read file, size:', pdfBuffer.length);
        
        // Return PDF file as response
        return new NextResponse(new Uint8Array(pdfBuffer), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="certificate-${certificate.certificateNumber || certificate._id}.pdf"`,
          },
        });
      } catch {
        console.log('[Certificate Download] File does not exist, generating PDF on-the-fly');
      }
    }
    
    // Generate PDF directly in memory (no file system needed)
    console.log('[Certificate Download] Generating PDF in memory...');
    
    // Get instructor name if available
    let instructorName = 'Course Instructor';
    if (certificate.course && typeof certificate.course === 'object' && 'instructor' in certificate.course) {
      const instructor = await (await import('@/models/User')).default.findById(certificate.course.instructor);
      if (instructor) {
        instructorName = instructor.name;
      }
    }

    console.log('[Certificate Download] Calling generateCertificatePDFBuffer...');
    const pdfResult = await generateCertificatePDFBuffer({
      userName: certificate.user.name || 'Student',
      courseName: typeof certificate.course === 'object' ? certificate.course.title : 'Course',
      completionDate: certificate.issuedAt,
      certificateNumber: certificate.certificateNumber,
      instructorName,
      organizationName: process.env.NEXT_PUBLIC_APP_NAME || 'Rhapsody International Missions',
    });

    if (!pdfResult.success) {
      console.error('[Certificate Download] Failed to generate PDF:', pdfResult.error);
      return errorResponse(`Failed to generate certificate: ${pdfResult.error}`, 500);
    }

    console.log('[Certificate Download] PDF generated successfully, buffer size:', pdfResult.buffer.length);

    // Return PDF file as response directly from buffer
    return new NextResponse(new Uint8Array(pdfResult.buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificate.certificateNumber || certificate._id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[Certificate Download] Error:', error);
    console.error('[Certificate Download] Error stack:', (error as Error).stack);
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return withAuth(request, (req) => getHandler(req, context));
}
