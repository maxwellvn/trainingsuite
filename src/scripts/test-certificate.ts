import { generateCertificatePDF } from '../lib/utils/certificate-generator';

async function testCertificateGeneration() {
  console.log('[Test] Starting certificate generation test...');
  
  const result = await generateCertificatePDF({
    userName: 'Test User',
    courseName: 'Test Course',
    completionDate: new Date(),
    certificateNumber: 'TEST-001',
    instructorName: 'Test Instructor',
    organizationName: 'Test Organization',
  });
  
  if (result.success) {
    console.log('[Test] SUCCESS! Certificate generated:', result);
  } else {
    console.error('[Test] FAILED! Certificate generation error:', result.error);
  }
  
  process.exit(result.success ? 0 : 1);
}

testCertificateGeneration().catch(error => {
  console.error('[Test] Unhandled error:', error);
  process.exit(1);
});
