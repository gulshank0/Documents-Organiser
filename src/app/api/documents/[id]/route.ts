import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { serializeBigInt } from '@/lib/utils';

export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any,
  { params }: { params: { id: string } }
) => {
  try {
    const documentId = params.id;
    const db = getDatabase();
    
    // Get the document with access check
    const document = await db.getDocumentById(documentId, user.id);
    
    if (!document) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Document not found',
          timestamp: new Date().toISOString()
        }, 
        { status: 404 }
      );
    }
    
    console.log('Document found:', document.filename);
    
    // Serialize BigInt values before returning
    const serializedDocument = serializeBigInt({
      ...document,
      // Add permission flags for the current user
      permissions: {
        canRead: true, // Already verified above
        canEdit: await db.canEditDocument(user.id, documentId),
        canDelete: document.userId === user.id,
        canShare: await db.canEditDocument(user.id, documentId)
      }
    });
    
    return NextResponse.json({
      success: true,
      data: serializedDocument,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch document',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

export const PUT = createAuthenticatedAPIHandler(
  async (request: NextRequest, user, authUser, { params }: { params: { id: string } }) => {
    try {
      const documentId = params.id;
      const updateData = await request.json();
      
      const db = getDatabase();
      
      // Check if user can edit this document
      const canEdit = await db.canEditDocument(user.id, documentId);
      if (!canEdit) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Access denied: You do not have permission to edit this document',
            timestamp: new Date().toISOString()
          }, 
          { status: 403 }
        );
      }

      const updatedDocument = await db.updateDocument(documentId, user.id, updateData);
      
      if (!updatedDocument) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Document not found or update failed',
            timestamp: new Date().toISOString()
          }, 
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: updatedDocument,
        message: 'Document updated successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error updating document:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to update document',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  }
);

export const DELETE = createAuthenticatedAPIHandler(
  async (request: NextRequest, user, authUser, { params }: { params: { id: string } }) => {
    try {
      const documentId = params.id;
      
      const db = getDatabase();
      
      // Check if user can delete this document
      const canDelete = await db.canEditDocument(user.id, documentId);
      if (!canDelete) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Access denied: You do not have permission to delete this document',
            timestamp: new Date().toISOString()
          }, 
          { status: 403 }
        );
      }

      const deleted = await db.deleteDocument(documentId, user.id);
      
      if (!deleted) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Document not found or deletion failed',
            timestamp: new Date().toISOString()
          }, 
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error deleting document:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to delete document',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  }
);