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
      console.log('[generateCertificatePDF] Starting with data:', JSON.stringify(data, null, 2));
      
      const {
        userName,
        courseName,
        completionDate,
        certificateNumber,
        instructorName = 'Course Instructor',
        organizationName = 'Rhapsody International Missions',
      } = data;

      // Initialize PDFKit before creating document (fixes Next.js path issues)
      console.log('[generateCertificatePDF] Initializing PDFKit...');
      initializePdfKit();
      console.log('[generateCertificatePDF] PDFKit initialized');

      // Create PDF document (landscape orientation)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Collect PDF data in buffer
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('error', (error: Error) => {
        console.error('[generateCertificatePDF] PDF stream error:', error);
        resolve({
          success: false,
          error: `PDF generation stream error: ${error.message}`,
        });
      });
      doc.on('end', async () => {
        try {
          console.log('[generateCertificatePDF] PDF stream ended, concatenating chunks...');
          const pdfBuffer = Buffer.concat(chunks);
          console.log('[generateCertificatePDF] PDF buffer size:', pdfBuffer.length);
          
          const fileName = `certificate-${certificateNumber}.pdf`;
          console.log('[generateCertificatePDF] Uploading with fileName:', fileName);

          const uploadResult = await uploadBuffer(
            pdfBuffer,
            'certificates',
            fileName,
            'application/pdf'
          );

          console.log('[generateCertificatePDF] Upload result:', JSON.stringify(uploadResult, null, 2));

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
        } catch (endError) {
          console.error('[generateCertificatePDF] Error in end handler:', endError);
          resolve({
            success: false,
            error: `Failed to process PDF: ${endError instanceof Error ? endError.message : String(endError)}`,
          });
        }
      });

      // Page dimensions and layout constants
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      // Color palette
      const colors = {
        primary: '#1a365d',      // Deep navy blue
        secondary: '#c9a227',    // Gold
        text: '#2d3748',         // Dark gray
        textLight: '#718096',    // Medium gray
        border: '#e2e8f0',       // Light gray
        accent: '#c9a227',       // Gold accent
      };

      // Draw elegant outer border
      doc
        .rect(25, 25, pageWidth - 50, pageHeight - 50)
        .lineWidth(2)
        .stroke(colors.secondary);

      // Draw inner border
      doc
        .rect(35, 35, pageWidth - 70, pageHeight - 70)
        .lineWidth(0.5)
        .stroke(colors.primary);

      // Corner decorations (simple elegant corners)
      const cornerSize = 20;
      const cornerOffset = 45;

      // Top-left corner
      doc.moveTo(cornerOffset, cornerOffset + cornerSize)
         .lineTo(cornerOffset, cornerOffset)
         .lineTo(cornerOffset + cornerSize, cornerOffset)
         .lineWidth(2)
         .stroke(colors.secondary);

      // Top-right corner
      doc.moveTo(pageWidth - cornerOffset - cornerSize, cornerOffset)
         .lineTo(pageWidth - cornerOffset, cornerOffset)
         .lineTo(pageWidth - cornerOffset, cornerOffset + cornerSize)
         .lineWidth(2)
         .stroke(colors.secondary);

      // Bottom-left corner
      doc.moveTo(cornerOffset, pageHeight - cornerOffset - cornerSize)
         .lineTo(cornerOffset, pageHeight - cornerOffset)
         .lineTo(cornerOffset + cornerSize, pageHeight - cornerOffset)
         .lineWidth(2)
         .stroke(colors.secondary);

      // Bottom-right corner
      doc.moveTo(pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset)
         .lineTo(pageWidth - cornerOffset, pageHeight - cornerOffset)
         .lineTo(pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize)
         .lineWidth(2)
         .stroke(colors.secondary);

      // Vertical spacing tracker - tighter spacing to fit on one page
      let currentY = 60;

      // Organization name at top
      doc
        .fontSize(10)
        .fillColor(colors.textLight)
        .text(organizationName.toUpperCase(), margin, currentY, {
          align: 'center',
          width: contentWidth,
          characterSpacing: 3,
        });

      currentY += 28;

      // Main title: CERTIFICATE
      doc
        .fontSize(42)
        .fillColor(colors.primary)
        .text('CERTIFICATE', margin, currentY, {
          align: 'center',
          width: contentWidth,
          characterSpacing: 5,
        });

      currentY += 48;

      // Subtitle: OF COMPLETION
      doc
        .fontSize(16)
        .fillColor(colors.textLight)
        .text('OF COMPLETION', margin, currentY, {
          align: 'center',
          width: contentWidth,
          characterSpacing: 3,
        });

      currentY += 30;

      // Decorative divider line
      const dividerWidth = 280;
      const dividerX = centerX - (dividerWidth / 2);
      doc
        .moveTo(dividerX, currentY)
        .lineTo(dividerX + dividerWidth, currentY)
        .lineWidth(1)
        .stroke(colors.secondary);

      currentY += 22;

      // "This is to certify that"
      doc
        .fontSize(11)
        .fillColor(colors.textLight)
        .text('This is to certify that', margin, currentY, {
          align: 'center',
          width: contentWidth,
        });

      currentY += 20;

      // Recipient name (prominent)
      doc
        .fontSize(32)
        .fillColor(colors.primary)
        .text(userName, margin, currentY, {
          align: 'center',
          width: contentWidth,
        });

      currentY += 42;

      // Line under name
      const nameLineWidth = 320;
      const nameLineX = centerX - (nameLineWidth / 2);
      doc
        .moveTo(nameLineX, currentY)
        .lineTo(nameLineX + nameLineWidth, currentY)
        .lineWidth(0.75)
        .stroke(colors.secondary);

      currentY += 20;

      // "has successfully completed the course"
      doc
        .fontSize(11)
        .fillColor(colors.textLight)
        .text('has successfully completed the course', margin, currentY, {
          align: 'center',
          width: contentWidth,
        });

      currentY += 20;

      // Course name
      doc
        .fontSize(20)
        .fillColor(colors.text)
        .text(courseName, margin, currentY, {
          align: 'center',
          width: contentWidth,
        });

      currentY += 30;

      // Completion date
      const formattedDate = completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc
        .fontSize(10)
        .fillColor(colors.textLight)
        .text(formattedDate, margin, currentY, {
          align: 'center',
          width: contentWidth,
        });

      // Signature section - positioned from bottom with proper spacing
      const signatureY = pageHeight - 100;
      const signatureWidth = 160;
      const signatureSpacing = 180; // Distance from center to each signature center

      // Left signature (Instructor)
      const leftSigX = centerX - signatureSpacing - (signatureWidth / 2);

      doc
        .moveTo(leftSigX, signatureY)
        .lineTo(leftSigX + signatureWidth, signatureY)
        .lineWidth(0.75)
        .stroke(colors.text);

      doc
        .fontSize(10)
        .fillColor(colors.text)
        .text(instructorName, leftSigX, signatureY + 6, {
          width: signatureWidth,
          align: 'center',
        });

      doc
        .fontSize(8)
        .fillColor(colors.textLight)
        .text('Course Instructor', leftSigX, signatureY + 20, {
          width: signatureWidth,
          align: 'center',
        });

      // Right signature (Program Director)
      const rightSigX = centerX + signatureSpacing - (signatureWidth / 2);

      doc
        .moveTo(rightSigX, signatureY)
        .lineTo(rightSigX + signatureWidth, signatureY)
        .lineWidth(0.75)
        .stroke(colors.text);

      doc
        .fontSize(10)
        .fillColor(colors.text)
        .text('Program Director', rightSigX, signatureY + 6, {
          width: signatureWidth,
          align: 'center',
        });

      doc
        .fontSize(8)
        .fillColor(colors.textLight)
        .text(organizationName, rightSigX, signatureY + 20, {
          width: signatureWidth,
          align: 'center',
        });

      // Certificate number at bottom center - inside the border
      doc
        .fontSize(7)
        .fillColor(colors.textLight)
        .text(`Certificate ID: ${certificateNumber}`, margin, pageHeight - 45, {
          align: 'center',
          width: contentWidth,
          characterSpacing: 1,
        });

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('[generateCertificatePDF] Certificate generation error:', error);
      console.error('[generateCertificatePDF] Error stack:', (error as Error).stack);
      resolve({
        success: false,
        error: `Failed to generate certificate: ${error instanceof Error ? error.message : String(error)}`,
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
