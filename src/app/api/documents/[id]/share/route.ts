import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { SharePermission } from '@/types';

export const POST = createAuthenticatedAPIHandler(
  async (request: NextRequest, user, authUser, { params }: { params: { id: string } }) => {
    try {
      const documentId = params.id;
      const data = await request.json();
      
      // Validate required fields
      if (!data.userEmails || !Array.isArray(data.userEmails) || data.userEmails.length === 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'userEmails array is required and must contain at least one email' 
          },
          { status: 400 }
        );
      }

      if (!data.permission || !['READ', 'WRITE', 'ADMIN'].includes(data.permission)) {
        return NextResponse.json(
          { 
        success: false, 
        error: 'Valid permission is required (READ, WRITE, or ADMIN)' 
          },
          { status: 400 }
        );
      }

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = data.userEmails.filter((email: string) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid email addresses found',
            invalidEmails 
          },
          { status: 400 }
        );
      }

      const db = getDatabase();
      
      // Check if user can share this document
      const canEdit = await db.canEditDocument(user.id, documentId);
      if (!canEdit) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Access denied: You do not have permission to share this document',
            timestamp: new Date().toISOString()
          }, 
          { status: 403 }
        );
      }

      // Parse expiration date if provided
      let expiresAt: Date | undefined;
      if (data.expiresAt) {
        expiresAt = new Date(data.expiresAt);
        if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid expiration date. Must be a future date.' 
            },
            { status: 400 }
          );
        }
      }

      await db.shareDocument({
        documentId,
        sharedBy: user.id,
        userEmails: data.userEmails,
        permission: data.permission,
        expiresAt
      });

      return NextResponse.json({
        success: true,
        message: `Document shared with ${data.userEmails.length} user(s)`,
        data: {
          documentId,
          sharedWith: data.userEmails,
          permission: data.permission,
          expiresAt: expiresAt?.toISOString(),
          sharedBy: user.email
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Document sharing error:', error);
      
      if (error.message.includes('Some users not found')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Some users were not found. All users must have accounts to share documents.',
            timestamp: new Date().toISOString()
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to share document',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  }
);