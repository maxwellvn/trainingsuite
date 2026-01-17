import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
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

interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
}

async function getUserFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  // First, check for JWT token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.AUTH_SECRET!) as JWTPayload;
      return decoded;
    } catch {
      // Invalid token, try Auth.js session
    }
  }

  // Fall back to Auth.js session
  const session = await auth();
  if (session?.user) {
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name!,
      role: session.user.role,
      isVerified: session.user.isVerified,
    };
  }

  return null;
}

export async function withAuth(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = user;

  return handler(authenticatedRequest);
}

export async function withRole(
  request: NextRequest,
  roles: UserRole[],
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  if (!roles.includes(user.role)) {
    return errorResponse('Forbidden: Insufficient permissions', 403);
  }

  const authenticatedRequest = request as AuthenticatedRequest;
  authenticatedRequest.user = user;

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
  const user = await getUserFromRequest(request);
  const authenticatedRequest = request as AuthenticatedRequest;

  if (user) {
    authenticatedRequest.user = user;
  }

  return handler(authenticatedRequest);
}
