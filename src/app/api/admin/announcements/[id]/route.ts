import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Announcement from '@/models/Announcement';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateAnnouncementSchema } from '@/lib/validations/admin';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update announcement (admin only)
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateAnnouncementSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.startsAt) {
      updateData.startsAt = new Date(validation.data.startsAt);
    }
    if (validation.data.expiresAt) {
      updateData.expiresAt = new Date(validation.data.expiresAt);
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!announcement) {
      return errorResponse('Announcement not found', 404);
    }

    return successResponse(announcement, 'Announcement updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete announcement (admin only)
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return errorResponse('Announcement not found', 404);
    }

    return successResponse(null, 'Announcement deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => deleteHandler(req, context));
}
