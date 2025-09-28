import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { serializeBigInt } from '@/lib/utils';

export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: documentId } = await params;
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
  async (request: NextRequest, user, authUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const resolvedParams = await params;
      const documentId = resolvedParams.id;
      
      console.log('PUT /api/documents/[id] - Starting update:', {
        documentId,
        userId: user.id,
        userEmail: user.email
      });
      
      // Parse request body
      const updateData = await parseRequestBody(request);
      
      const db = getDatabase();
      
      // Validate database connection
      await validateDatabaseConnection(db);
      
      // Check permissions
      await validateEditPermissions(db, user.id, documentId);
      
      // Validate folder if provided
      if (updateData.folderId) {
        await validateFolder(db, updateData.folderId);
      }

      // Update document
      const updatedDocument = await db.updateDocument(documentId, user.id, updateData);
      
      if (!updatedDocument) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Document not found or update failed',
            details: 'The document update operation did not return a result',
            timestamp: new Date().toISOString()
          }, 
          { status: 404 }
        );
      }
      
      console.log('Document updated successfully:', {
        documentId,
        filename: updatedDocument.filename,
        folderId: updatedDocument.folderId
      });
      
      return NextResponse.json({
        success: true,
        data: serializeBigInt(updatedDocument),
        message: 'Document updated successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      return handleUpdateError(error, user?.id);
    }
  }
);

// Helper functions to reduce cognitive complexity
async function parseRequestBody(request: NextRequest) {
  try {
    const updateData = await request.json();
    console.log('Update data received:', updateData);
    return updateData;
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    throw new Error('Invalid JSON in request body');
  }
}

async function validateDatabaseConnection(db: any) {
  try {
    await db.testConnection();
  } catch (dbError) {
    console.error('Database connection failed:', dbError);
    const error = new Error('Database connection failed');
    (error as any).statusCode = 503;
    (error as any).details = dbError instanceof Error ? dbError.message : 'Unknown database error';
    throw error;
  }
}

async function validateEditPermissions(db: any, userId: string, documentId: string) {
  console.log('Checking edit permissions...');
  const canEdit = await db.canEditDocument(userId, documentId);
  if (!canEdit) {
    console.log('Access denied - user cannot edit document');
    const error = new Error('Access denied: You do not have permission to edit this document');
    (error as any).statusCode = 403;
    throw error;
  }
  console.log('Permission check passed, updating document...');
}

async function validateFolder(db: any, folderId: string | null) {
  if (folderId === null || folderId === undefined || folderId === '') {
    return;
  }
  
  try {
    const folder = await db.client.folder.findUnique({
      where: { id: folderId }
    });
    
    if (!folder) {
      console.error('Folder not found:', folderId);
      const error = new Error('Folder not found');
      (error as any).statusCode = 400;
      (error as any).details = `No folder found with ID: ${folderId}`;
      throw error;
    }
    
    console.log('Folder validation passed:', folder.name);
  } catch (folderError) {
    console.error('Error validating folder:', folderError);
    if ((folderError as any).statusCode) {
      throw folderError;
    }
    const error = new Error('Error validating folder');
    (error as any).statusCode = 500;
    (error as any).details = folderError instanceof Error ? folderError.message : 'Unknown error';
    throw error;
  }
}

function handleUpdateError(error: any, userId?: string) {
  console.error('Error updating document:', {
    error: error.message,
    stack: error.stack,
    userId
  });
  
  // Use existing status code if available
  const statusCode = error.statusCode || 500;
  const details = error.details || error.message || 'An unexpected error occurred';
  
  // Map specific errors
  if (error.message?.includes('Database connection')) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection issue',
        details,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
  
  if (error.message?.includes('Access denied')) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        details: 'User does not have permission to edit this document',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    );
  }
  
  // Prisma errors
  if (error.code === 'P2002') {
    return NextResponse.json(
      { 
        success: false,
        error: 'Duplicate constraint violation',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 409 }
    );
  }
  
  if (error.code === 'P2025') {
    return NextResponse.json(
      { 
        success: false,
        error: 'Record not found',
        details: 'The document you are trying to update was not found',
        timestamp: new Date().toISOString()
      },
      { status: 404 }
    );
  }
  
  return NextResponse.json(
    { 
      success: false,
      error: 'Failed to update document',
      details,
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  );
}

export const DELETE = createAuthenticatedAPIHandler(
  async (request: NextRequest, user, authUser, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: documentId } = await params;
      
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