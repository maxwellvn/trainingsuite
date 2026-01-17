import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Category from '@/models/Category';
import { withAdmin, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateCategorySchema } from '@/lib/validations/course';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { createSlug } from '@/lib/utils/slugify';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get category by ID
async function getHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const category = await Category.findById(id);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    if (!category.isActive && request.user?.role !== 'admin') {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update category (admin only)
async function putHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const validation = await validateBody(request, updateCategorySchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const updateData: Record<string, unknown> = { ...validation.data };

    // Update slug if name changes
    if (validation.data.name) {
      updateData.slug = createSlug(validation.data.name);
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category, 'Category updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete category (admin only)
async function deleteHandler(request: AuthenticatedRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectDB();

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(null, 'Category deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: RouteParams) {
  return optionalAuth(request, (req) => getHandler(req, context));
}

export async function PUT(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => putHandler(req, context));
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  return withAdmin(request, (req) => deleteHandler(req, context));
}
