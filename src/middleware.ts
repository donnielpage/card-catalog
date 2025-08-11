import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers to prevent common attacks
  response.headers.set('X-Frame-Options', 'DENY'); // Prevent clickjacking
  response.headers.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Limit referrer information
  response.headers.set('X-XSS-Protection', '1; mode=block'); // Enable XSS filtering
  
  // Content Security Policy - restrictive but allows necessary resources
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: eval needed for Next.js
    "style-src 'self' 'unsafe-inline'", // Inline styles needed for dynamic team colors
    "img-src 'self' data: blob:", // Allow images from uploads and data URIs
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);

  // Additional security headers for HTTPS (when available)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};