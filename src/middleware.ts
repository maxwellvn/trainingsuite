import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://trainings.movortech.com',
  'https://apis.movortech.com',
  process.env.FRONTEND_URL,
  process.env.NEXTAUTH_URL,
  process.env.AUTH_URL,
].filter(Boolean);

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isUploadsRoute = request.nextUrl.pathname.startsWith('/uploads');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth');
  const needsCors = isApiRoute || isUploadsRoute || isAuthRoute;

  // Handle preflight requests
  if (request.method === 'OPTIONS' && needsCors) {
    const response = new NextResponse(null, { status: 204 });

    if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  }

  // Handle actual requests
  const response = NextResponse.next();

  if (needsCors && origin) {
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/uploads/:path*', '/login', '/auth/:path*'],
};
