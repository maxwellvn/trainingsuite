import { NextRequest } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { uploadFile, UploadFolder } from '@/lib/utils/file-upload';
import { UserRole } from '@/types';

// POST - Upload file
async function postHandler(request: AuthenticatedRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = formData.get('folder') as UploadFolder | null;

    if (!file) {
      return errorResponse('File is required', 400);
    }

    if (!folder) {
      return errorResponse('Folder is required', 400);
    }

    // Validate folder
    const allowedFolders: UploadFolder[] = ['materials', 'thumbnails', 'avatars', 'certificates'];
    if (!allowedFolders.includes(folder)) {
      return errorResponse('Invalid folder specified. Allowed: materials, thumbnails, avatars, certificates', 400);
    }

    // Check permissions for certain folders
    if (folder === 'materials' || folder === 'thumbnails') {
      const isInstructor = request.user!.role === UserRole.INSTRUCTOR;
      const isAdmin = request.user!.role === UserRole.ADMIN;

      if (!isInstructor && !isAdmin) {
        return errorResponse('Only instructors and admins can upload to this folder', 403);
      }
    }

    const uploadResult = await uploadFile(file, folder);

    if (!uploadResult.success) {
      return errorResponse(uploadResult.error, 400);
    }

    return successResponse({
      fileUrl: uploadResult.fileUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.fileSize,
      mimeType: uploadResult.mimeType,
    }, 'File uploaded successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, postHandler);
}
