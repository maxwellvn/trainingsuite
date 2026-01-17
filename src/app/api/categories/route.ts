import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import Category from '@/models/Category';
import { withAdmin, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { createCategorySchema } from '@/lib/validations/course';
import { successResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams } from '@/lib/utils/pagination';
import { createSlug } from '@/lib/utils/slugify';

// GET - List all categories
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query = includeInactive && request.user?.role === 'admin' ? {} : { isActive: true };

    const [categories, total] = await Promise.all([
      Category.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Category.countDocuments(query),
    ]);

    return paginatedResponse(categories, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create category (admin only)
async function postHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, createCategorySchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    const slug = createSlug(validation.data.name);

    const category = await Category.create({
      ...validation.data,
      slug,
    });

    return successResponse(category, 'Category created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return optionalAuth(request, getHandler);
}

export async function POST(request: NextRequest) {
  return withAdmin(request, postHandler);
}
