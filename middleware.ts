import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Enhanced token verification with NextAuth support
async function verifyAuthentication(request: NextRequest): Promise<boolean> {
  try {
    // Check NextAuth JWT token first
    const nextAuthToken = await getToken({ 
      req: request as any, 
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET 
    });
    
    if (nextAuthToken?.email) {
      return true;
    }

    // Check custom auth token (for email/password login)
    const authTokenFromCookie = request.cookies.get('auth-token')?.value;
    const authTokenFromHeader = request.headers.get('Authorization')?.replace('Bearer ', '');
    const customToken = authTokenFromCookie || authTokenFromHeader;

    if (!customToken || customToken.length < 10) {
      return false;
    }

    // Basic JWT structure validation
    if (customToken.includes('.')) {
      const parts = customToken.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Additional validation: check if token is not expired (basic check)
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return false; // Token expired
        }
      } catch {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('[MIDDLEWARE] Authentication verification error:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] MIDDLEWARE: Processing ${request.method} request for ${pathname}`);

  // Define route categories
  const publicRoutes = ['/', '/login', '/register'];
  const apiAuthRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/logout'];
  const staticAssets = ['/_next', '/favicon.ico', '/logo.png', '/public'];
  
  // Check route type
  const isPublicRoute = publicRoutes.includes(pathname);
  const isApiAuthRoute = apiAuthRoutes.some(route => pathname.startsWith(route));
  const isStaticAsset = staticAssets.some(asset => pathname.startsWith(asset));
  
  // Allow static assets and public API routes without authentication
  if (isStaticAsset) {
    return NextResponse.next();
  }

  // Allow public API auth routes (login, register, etc.)
  if (isApiAuthRoute) {
    console.log(`[${timestamp}] ALLOWING: API auth route ${pathname}`);
    return NextResponse.next();
  }

  // Verify authentication
  const isAuthenticated = await verifyAuthentication(request);
  
  console.log(`[${timestamp}] Authentication status: ${isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED'}`);

  // Handle unauthenticated users
  if (!isAuthenticated) {
    // If accessing protected route, redirect to home page
    if (!isPublicRoute) {
      console.log(`[${timestamp}] BLOCKING: Unauthenticated access to ${pathname}, redirecting to /`);
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('redirect', pathname); // Save intended destination
      
      const response = NextResponse.redirect(url);
      
      // Clear any invalid tokens
      response.cookies.set('auth-token', '', {
        path: '/',
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      return response;
    }
    
    // Allow access to public routes
    console.log(`[${timestamp}] ALLOWING: Public route ${pathname}`);
    return NextResponse.next();
  }

  // Handle authenticated users
  if (isAuthenticated) {
    // Redirect authenticated users away from login/register pages
    if (pathname === '/login' || pathname === '/register') {
      console.log(`[${timestamp}] REDIRECTING: Authenticated user from ${pathname} to /dashboard`);
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // Allow access to protected routes for authenticated users
    console.log(`[${timestamp}] ALLOWING: Authenticated access to ${pathname}`);
    return NextResponse.next();
  }

  // Fallback: allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files) 
     * - favicon.ico (favicon file)
     * - Static assets (png, svg, ico, css, js)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.css$|.*\\.js$).*)',
  ],
}