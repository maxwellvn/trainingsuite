import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types';
import { errorResponse } from '@/lib/utils/api-response';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
  };
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return errorResponse('Unauthorized', 401);
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role,
    isVerified: session.user.isVerified,
  };

  return handler(authenticatedRequest);
}

export async function withRole(
  request: NextRequest,
  roles: UserRole[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return errorResponse('Unauthorized', 401);
  }

  if (!roles.includes(session.user.role)) {
    return errorResponse('Forbidden: Insufficient permissions', 403);
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
    role: session.user.role,
    isVerified: session.user.isVerified,
  };

  return handler(authenticatedRequest);
}

export async function withAdmin(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(request, [UserRole.ADMIN], handler);
}

export async function withInstructor(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  return withRole(request, [UserRole.ADMIN, UserRole.INSTRUCTOR], handler);
}

export async function optionalAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth();
  const authenticatedRequest = request as AuthenticatedRequest;

  if (session?.user) {
    authenticatedRequest.user = {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name!,
      role: session.user.role,
      isVerified: session.user.isVerified,
    };
  }

  return handler(authenticatedRequest);
}
