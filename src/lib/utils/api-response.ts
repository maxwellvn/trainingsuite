import { NextResponse } from 'next/server';
import { ApiResponse, PaginatedResponse } from '@/types';

export function successResponse<T>(data: T, message?: string, status = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return NextResponse.json(response, { status });
}

export function errorResponse(error: string, status = 400, errors?: Record<string, string[]>): NextResponse {
  const response: ApiResponse = {
    success: false,
    error,
    errors,
  };
  return NextResponse.json(response, { status });
}

export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
): NextResponse {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasMore: pagination.page < totalPages,
    },
  };
  return NextResponse.json(response, { status: 200 });
}

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      return errorResponse('Validation failed', 400);
    }

    // Mongoose duplicate key error
    if (error.name === 'MongoServerError' && (error as any).code === 11000) {
      return errorResponse('Duplicate entry found', 409);
    }

    // Mongoose cast error (invalid ObjectId)
    if (error.name === 'CastError') {
      return errorResponse('Invalid ID format', 400);
    }

    return errorResponse(error.message, 500);
  }

  return errorResponse('An unexpected error occurred', 500);
}
