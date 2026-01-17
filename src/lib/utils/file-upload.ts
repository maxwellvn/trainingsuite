import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type UploadFolder = 'materials' | 'thumbnails' | 'avatars' | 'certificates';

interface UploadResult {
  success: true;
  filePath: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface UploadError {
  success: false;
  error: string;
}

const ALLOWED_MIME_TYPES: Record<UploadFolder, string[]> = {
  materials: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
  ],
  thumbnails: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  certificates: ['application/pdf'],
};

const MAX_FILE_SIZES: Record<UploadFolder, number> = {
  materials: 100 * 1024 * 1024, // 100MB
  thumbnails: 5 * 1024 * 1024, // 5MB
  avatars: 2 * 1024 * 1024, // 2MB
  certificates: 10 * 1024 * 1024, // 10MB
};

function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
  };
  return extensions[mimeType] || '';
}

export async function uploadFile(
  file: File,
  folder: UploadFolder,
  customFileName?: string
): Promise<UploadResult | UploadError> {
  try {
    // Validate mime type
    const allowedTypes = ALLOWED_MIME_TYPES[folder];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: `File type ${file.type} is not allowed for ${folder}`,
      };
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[folder];
    if (file.size > maxSize) {
      return {
        success: false,
        error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`,
      };
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const extension = getFileExtension(file.type) || path.extname(file.name);
    const fileName = customFileName
      ? `${customFileName}${extension}`
      : `${uuidv4()}${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Convert file to buffer and write
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return file info
    const fileUrl = `/uploads/${folder}/${fileName}`;

    return {
      success: true,
      filePath,
      fileName,
      fileUrl,
      fileSize: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'Failed to upload file',
    };
  }
}

export async function uploadBuffer(
  buffer: Buffer,
  folder: UploadFolder,
  fileName: string,
  mimeType: string
): Promise<UploadResult | UploadError> {
  try {
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${folder}/${fileName}`;

    return {
      success: true,
      filePath,
      fileName,
      fileUrl,
      fileSize: buffer.length,
      mimeType,
    };
  } catch (error) {
    console.error('Buffer upload error:', error);
    return {
      success: false,
      error: 'Failed to save file',
    };
  }
}

export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract relative path from URL
    const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
    const filePath = path.join(process.cwd(), 'public', relativePath);

    if (existsSync(filePath)) {
      await unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
}

export function getFileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
