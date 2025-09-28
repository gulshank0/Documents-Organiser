import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/database';
import { AuthUser, UserWithRelations } from '@/types';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export interface AuthenticatedRequest extends NextRequest {
  user?: UserWithRelations;
  authUser?: AuthUser;
}

export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  user?: UserWithRelations;
  authUser?: AuthUser;
  error?: string;
}> {
  try {
    // Try NextAuth JWT token first (this works better in API routes)
    const token = await getToken({ 
      req: request as any, 
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
    });
    
    console.log('NextAuth token:', token ? 'found' : 'not found');
    
    if (token?.email) {
      const db = getDatabase();
      
      // Find user by email from the JWT token
      const user = await db.client.user.findUnique({
        where: { email: token.email },
        include: {
          preferences: true,
          organizations: {
            include: {
              organization: true
            }
          }
        }
      });
      
      console.log('User found by email:', user ? `${user.email} (${user.id})` : 'not found');
      
      if (user && user.isActive) {
        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          avatar: user.avatar || undefined,
          userType: user.userType,
          profession: user.profession || undefined,
          currentOrganization: user.organizations?.[0]?.organizationId
        };
        
        return {
          success: true,
          user,
          authUser
        };
      } else {
        console.log('User not found or inactive for email:', token.email);
      }
    }
    
    // If no NextAuth token, try custom JWT token (for email/password users)
    const customToken = request.cookies.get('auth-token')?.value || 
                        request.headers.get('Authorization')?.replace('Bearer ', '');

    console.log('Custom token:', customToken ? 'found' : 'not found');

    if (!customToken) {
      return {
        success: false,
        error: 'No authentication token or session found'
      };
    }

    const db = getDatabase();
    const authUser = db.verifyJWT(customToken);

    if (!authUser) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    // Get full user data
    const user = await db.getUserById(authUser.id);

    if (!user || !user.isActive) {
      return {
        success: false,
        error: 'User not found or inactive'
      };
    }

    return {
      success: true,
      user,
      authUser
    };

  } catch (error: any) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

export function createAuthenticatedHandler<T = any>(
  handler: (request: NextRequest, user: UserWithRelations, authUser: AuthUser) => Promise<Response>
) {
  return async (request: NextRequest): Promise<Response> => {
    const auth = await authenticateRequest(request);

    if (!auth.success || !auth.user || !auth.authUser) {
      return Response.json(
        { 
          success: false, 
          error: auth.error || 'Authentication required' 
        },
        { status: 401 }
      );
    }

    return handler(request, auth.user, auth.authUser);
  };
}

export function createAuthenticatedAPIHandler<T = any>(
  handler: (request: NextRequest, user: UserWithRelations, authUser: AuthUser, params?: any) => Promise<Response>
) {
  return async (request: NextRequest, params?: any): Promise<Response> => {
    const auth = await authenticateRequest(request);

    if (!auth.success || !auth.user || !auth.authUser) {
      return Response.json(
        { 
          success: false, 
          error: auth.error || 'Authentication required',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      );
    }

    try {
      return await handler(request, auth.user, auth.authUser, params);
    } catch (error: any) {
      console.error('API handler error:', error);
      return Response.json(
        { 
          success: false, 
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  };
}

// Role-based access control
export function requireRole(allowedRoles: string[]) {
  return (user: UserWithRelations, organizationId?: string): boolean => {
    if (!organizationId) {
      return true; // No organization context, allow access
    }

    const membership = user.organizations?.find(org => org.organizationId === organizationId);
    if (!membership) {
      return false; // Not a member of the organization
    }

    return allowedRoles.includes(membership.role);
  };
}

// Permission checking utility
export async function checkDocumentAccess(
  userId: string, 
  documentId: string, 
  action: 'read' | 'write' | 'delete' | 'share'
): Promise<boolean> {
  const db = getDatabase();
  
  switch (action) {
    case 'read':
      return db.canAccessDocument(userId, documentId);
    case 'write':
    case 'delete':
    case 'share':
      return db.canEditDocument(userId, documentId);
    default:
      return false;
  }
}

// Storage quota checking
export async function checkStorageQuota(userId: string, fileSize: number): Promise<{
  allowed: boolean;
  currentUsage: number;
  maxStorage: number;
  remainingStorage: number;
}> {
  const db = getDatabase();
  
  // Get user's current storage usage
  const user = await db.getUserById(userId);
  if (!user) {
    return { allowed: false, currentUsage: 0, maxStorage: 0, remainingStorage: 0 };
  }

  // Calculate current usage (this would need to be implemented in the database)
  const currentUsage = 0; // TODO: Calculate actual usage
  
  // Determine max storage based on user type
  const maxStorage = user.userType === 'ORGANIZATION' ? 
    10 * 1024 * 1024 * 1024 : // 10GB for organizations
    1 * 1024 * 1024 * 1024;   // 1GB for individuals

  const remainingStorage = maxStorage - currentUsage;
  const allowed = fileSize <= remainingStorage;

  return {
    allowed,
    currentUsage,
    maxStorage,
    remainingStorage
  };
}

// Rate limiting utility (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string, 
  endpoint: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  let userLimit = rateLimitStore.get(key);
  
  if (!userLimit || userLimit.resetTime < windowStart) {
    userLimit = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, userLimit);
  }

  userLimit.count++;
  const allowed = userLimit.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - userLimit.count);

  return {
    allowed,
    remaining,
    resetTime: userLimit.resetTime
  };
}

// Input validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Organization context helper
export function getCurrentOrganization(user: UserWithRelations, request: NextRequest): string | null {
  // Check for organization ID in headers, query params, or use user's first organization
  const orgIdFromHeader = request.headers.get('x-organization-id');
  const url = new URL(request.url);
  const orgIdFromQuery = url.searchParams.get('organizationId');
  
  return orgIdFromHeader || 
         orgIdFromQuery || 
         user.organizations?.[0]?.organizationId || 
         null;
}