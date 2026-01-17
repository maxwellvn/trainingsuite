import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response';
import { getPaginationParams, getSortParams } from '@/lib/utils/pagination';

// GET - List all users (admin only)
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = getPaginationParams(searchParams);
    const sort = getSortParams(searchParams, ['createdAt', 'name', 'email'], '-createdAt');

    const query: Record<string, unknown> = {};

    const role = searchParams.get('role');
    if (role) query.role = role;

    const search = searchParams.get('search');
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const isVerified = searchParams.get('isVerified');
    if (isVerified !== null) query.isVerified = isVerified === 'true';

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return paginatedResponse(users, { page, limit, total });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}
