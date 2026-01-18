import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { uploadBuffer } from './file-upload';
import { generateCertificateNumber } from './slugify';

// Monkey-patch fs.readFileSync to handle PDFKit's font loading
const initializePdfKit = () => {
  try {
    // Store the original readFileSync
    const originalReadFileSync = fs.readFileSync;
    
    // Create a patched version that handles PDFKit font requests
    (fs as any).readFileSync = function(filePath: fs.PathOrFileDescriptor, options?: any) {
      const pathStr = String(filePath);
      
      // Check if this is a PDFKit font file request
      if (pathStr.includes('.afm') && (pathStr.includes('/ROOT/') || pathStr.includes('pdfkit'))) {
        // Return a minimal AFM file content for standard fonts
        const fontName = path.basename(pathStr, '.afm');
        const minimalAfm = `StartFontMetrics 4.1
FontName ${fontName}
EncodingScheme AdobeStandardEncoding
FullName ${fontName}
FamilyName ${fontName}
Weight Medium
ItalicAngle 0
IsFixedPitch false
CharacterSet ExtendedRoman
FontBBox -50 -200 1000 900
UnderlinePosition -100
UnderlineThickness 50
Version 001.000
Notice Copyright (c) 1985, 1987, 1989, 1990, 1991, 1992, 1993, 1997 Adobe Systems Incorporated. All Rights Reserved.
CapHeight 700
XHeight 500
Ascender 800
Descender -200
StdHW 50
StdVW 50
StartCharMetrics 1
C 32 ; WX 250 ; N space ; B 0 0 0 0 ;
EndCharMetrics
EndFontMetrics`;
        
        return minimalAfm;
      }
      
      // For all other files, use the original readFileSync
      return originalReadFileSync.call(fs, filePath, options);
    };
    
    console.log('[Certificate Generator] PDFKit fs monkey-patch installed');
    return true;
  } catch (error) {
    console.error('[Certificate Generator] Failed to initialize PDFKit:', error);
    return false;
  }
};

interface CertificateData {
  userName: string;
  courseName: string;
  completionDate: Date;
  certificateNumber: string;
  instructorName?: string;
  organizationName?: string;
}

interface GeneratedCertificate {
  success: true;
  certificateUrl: string;
  certificateNumber: string;
}

interface CertificateError {
  success: false;
  error: string;
}

export async function generateCertificatePDF(
  data: CertificateData
): Promise<GeneratedCertificate | CertificateError> {
  return new Promise((resolve) => {
    try {
      const {
        userName,
        courseName,
        completionDate,
        certificateNumber,
        instructorName = 'Course Instructor',
        organizationName = 'Rhapsody International Missions',
      } = data;

      // Initialize PDFKit before creating document (fixes Next.js path issues)
      initializePdfKit();

      // Create PDF document (landscape orientation)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Collect PDF data in buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `certificate-${certificateNumber}.pdf`;

        const uploadResult = await uploadBuffer(
          pdfBuffer,
          'certificates',
          fileName,
          'application/pdf'
        );

        if (uploadResult.success) {
          resolve({
            success: true,
            certificateUrl: uploadResult.fileUrl,
            certificateNumber,
          });
        } else {
          resolve({
            success: false,
            error: uploadResult.error,
          });
        }
      });

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // Draw decorative border
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(3)
        .stroke('#4F46E5');

      doc
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .stroke('#4F46E5');

      // Header decoration
      doc
        .moveTo(100, 80)
        .lineTo(pageWidth - 100, 80)
        .lineWidth(2)
        .stroke('#10B981');

      // Organization name
      doc
        .fontSize(14)
        .fillColor('#666666')
        .text(organizationName.toUpperCase(), 0, 100, {
          align: 'center',
          width: pageWidth,
        });

      // Certificate title
      doc
        .fontSize(42)
        .fillColor('#4F46E5')
        .text('CERTIFICATE', 0, 130, {
          align: 'center',
          width: pageWidth,
        });

      doc
        .fontSize(24)
        .fillColor('#333333')
        .text('OF COMPLETION', 0, 180, {
          align: 'center',
          width: pageWidth,
        });

      // Decorative line
      doc
        .moveTo(250, 220)
        .lineTo(pageWidth - 250, 220)
        .lineWidth(1)
        .stroke('#CCCCCC');

      // "This is to certify that" text
      doc
        .fontSize(14)
        .fillColor('#666666')
        .text('This is to certify that', 0, 250, {
          align: 'center',
          width: pageWidth,
        });

      // Recipient name
      doc
        .fontSize(32)
        .fillColor('#1F2937')
        .text(userName, 0, 280, {
          align: 'center',
          width: pageWidth,
        });

      // Decorative line under name
      doc
        .moveTo(200, 325)
        .lineTo(pageWidth - 200, 325)
        .lineWidth(1)
        .stroke('#4F46E5');

      // "has successfully completed" text
      doc
        .fontSize(14)
        .fillColor('#666666')
        .text('has successfully completed the course', 0, 350, {
          align: 'center',
          width: pageWidth,
        });

      // Course name
      doc
        .fontSize(24)
        .fillColor('#4F46E5')
        .text(courseName, 0, 380, {
          align: 'center',
          width: pageWidth,
        });

      // Completion date
      const formattedDate = completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc
        .fontSize(12)
        .fillColor('#666666')
        .text(`Completed on ${formattedDate}`, 0, 430, {
          align: 'center',
          width: pageWidth,
        });

      // Signature section
      const signatureY = 480;

      // Left signature (Instructor)
      doc
        .moveTo(120, signatureY)
        .lineTo(280, signatureY)
        .lineWidth(1)
        .stroke('#333333');

      doc
        .fontSize(12)
        .fillColor('#333333')
        .text(instructorName, 120, signatureY + 10, {
          width: 160,
          align: 'center',
        });

      doc
        .fontSize(10)
        .fillColor('#666666')
        .text('Instructor', 120, signatureY + 28, {
          width: 160,
          align: 'center',
        });

      // Right signature (Organization)
      doc
        .moveTo(pageWidth - 280, signatureY)
        .lineTo(pageWidth - 120, signatureY)
        .lineWidth(1)
        .stroke('#333333');

      doc
        .fontSize(12)
        .fillColor('#333333')
        .text('Program Director', pageWidth - 280, signatureY + 10, {
          width: 160,
          align: 'center',
        });

      doc
        .fontSize(10)
        .fillColor('#666666')
        .text(organizationName, pageWidth - 280, signatureY + 28, {
          width: 160,
          align: 'center',
        });

      // Certificate number at bottom
      doc
        .fontSize(9)
        .fillColor('#999999')
        .text(`Certificate No: ${certificateNumber}`, 0, pageHeight - 60, {
          align: 'center',
          width: pageWidth,
        });

      // Footer decoration
      doc
        .moveTo(100, pageHeight - 80)
        .lineTo(pageWidth - 100, pageHeight - 80)
        .lineWidth(2)
        .stroke('#10B981');

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Certificate generation error:', error);
      resolve({
        success: false,
        error: 'Failed to generate certificate',
      });
    }
  });
}

export async function createCertificate(
  userId: string,
  courseId: string,
  userName: string,
  courseName: string,
  instructorName?: string
): Promise<GeneratedCertificate | CertificateError> {
  const certificateNumber = generateCertificateNumber();

  return generateCertificatePDF({
    userName,
    courseName,
    completionDate: new Date(),
    certificateNumber,
    instructorName,
    organizationName: process.env.NEXT_PUBLIC_APP_NAME || 'Rhapsody International Missions',
  });
}
