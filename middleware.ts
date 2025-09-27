import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple token verification without JWT dependency to avoid issues
function isValidAuthToken(token: string): boolean {
  try {
    // Basic token validation - check if it exists and has proper format
    if (!token || token.length < 10) {
      return false;
    }
    
    // For JWT tokens, basic structure check
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('Token validation error:', error);
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const timestamp = new Date().toISOString();
  
  // Always log middleware execution
  console.log(`[${timestamp}] MIDDLEWARE: Processing request for ${pathname}`);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const apiAuthRoutes = ['/api/auth'];
  const staticRoutes = ['/_next', '/favicon.ico', '/public'];
  
  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiAuthRoute = apiAuthRoutes.some(route => pathname.startsWith(route));
  const isStaticRoute = staticRoutes.some(route => pathname.startsWith(route));
  
  console.log(`[${timestamp}] Route type - Public: ${isPublicRoute}, API Auth: ${isApiAuthRoute}, Static: ${isStaticRoute}`);
  
  // Allow access to public routes, auth API routes, and static files
  if (isPublicRoute || isApiAuthRoute || isStaticRoute) {
    console.log(`[${timestamp}] ALLOWING: Public/Auth/Static route access`);
    return NextResponse.next();
  }

  // Get authentication token from cookies or Authorization header
  const authTokenFromCookie = request.cookies.get('auth-token')?.value;
  const authTokenFromHeader = request.headers.get('Authorization')?.replace('Bearer ', '');
  const authToken = authTokenFromCookie || authTokenFromHeader;

  console.log(`[${timestamp}] Auth token check - Cookie: ${!!authTokenFromCookie}, Header: ${!!authTokenFromHeader}`);

  // If no token is found, redirect to login page
  if (!authToken) {
    console.log(`[${timestamp}] BLOCKING: No auth token found, redirecting to login`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Basic token validation
  const isValidToken = isValidAuthToken(authToken);
  console.log(`[${timestamp}] Token validation result: ${isValidToken}`);
  
  // If token is invalid, clear cookie and redirect to login
  if (!isValidToken) {
    console.log(`[${timestamp}] BLOCKING: Invalid token, redirecting to login`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    
    // Clear the invalid auth token cookie
    response.cookies.set('auth-token', '', {
      path: '/',
      expires: new Date(0),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return response;
  }

  // For authenticated users trying to access login/register, redirect to dashboard
  if (isValidToken && (pathname === '/login' || pathname === '/register')) {
    console.log(`[${timestamp}] REDIRECTING: Authenticated user from auth page to dashboard`);
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  console.log(`[${timestamp}] ALLOWING: Valid token access to protected route`);
  // Allow the request to continue for protected routes with valid token
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files) 
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.css$|.*\\.js$).*)',
  ],
}