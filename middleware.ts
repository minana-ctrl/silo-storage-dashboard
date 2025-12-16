import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Lazy getter for JWT_SECRET - only validates when actually needed at runtime
let cachedJWTSecret: Uint8Array | null = null;

function getJWTSecret(): Uint8Array {
  // Return cached value if already validated
  if (cachedJWTSecret) {
    return cachedJWTSecret;
  }

  // Validate JWT_SECRET exists and is strong enough
  const JWT_SECRET_STRING = process.env.JWT_SECRET;

  if (!JWT_SECRET_STRING) {
    throw new Error(
      'JWT_SECRET environment variable is not set. Authentication cannot function without a secure secret key.'
    );
  }

  if (JWT_SECRET_STRING.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. Please use a strong, random secret.'
    );
  }

  // Cache the encoded secret
  cachedJWTSecret = new TextEncoder().encode(JWT_SECRET_STRING);
  return cachedJWTSecret;
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/sync-transcripts'];

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy (adjust as needed for your app)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow static assets (images, favicons, etc.) without authentication
  if (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image')
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow public routes without checking auth
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is already logged in and tries to access login, redirect to home
    if (pathname.startsWith('/login')) {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        try {
          await jwtVerify(token, getJWTSecret());
          // Token is valid, redirect to home
          const response = NextResponse.redirect(new URL('/', request.url));
          return addSecurityHeaders(response);
        } catch (error) {
          // Invalid token, allow access to login
        }
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Check authentication for protected routes
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // No token, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    return addSecurityHeaders(response);
  }

  try {
    // Verify token is valid
    await jwtVerify(token, getJWTSecret());
    // Token is valid, allow access
    return addSecurityHeaders(NextResponse.next());
  } catch (error) {
    // Invalid or expired token, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    return addSecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.jpg, favicon.svg (favicon files)
     * - images/ (public images folder)
     * - public folder paths
     */
    '/((?!_next/static|_next/image|favicon|images/).*)',
  ],
};

