import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { cloudinaryService } from '@/lib/cloudinary';

export const POST = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any,
  { params }: { params: { id: string } }
) => {
  try {
    const documentId = params.id;
    console.log('Document repair requested for:', documentId, 'by user:', user.id);
    
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    
    // Get the document
    const document = await db.getDocumentById(documentId, user.id);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user has edit access
    const canEdit = await db.canEditDocument(user.id, documentId);
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('Analyzing document for repair:', {
      filename: document.filename,
      cloudinaryUrl: document.cloudinaryUrl,
      cloudinaryPublicId: document.cloudinaryPublicId
    });

    const repairActions = [];
    let needsRepair = false;
    let newCloudinaryUrl = document.cloudinaryUrl;
    let newPublicId = document.cloudinaryPublicId;

    // Check for common issues
    if (document.cloudinaryUrl) {
      // Issue 1: Double file extensions (.pdf.pdf)
      if (document.cloudinaryUrl.includes('.pdf.pdf')) {
        needsRepair = true;
        repairActions.push('Fixed double .pdf.pdf extension');
        
        // Repair the public ID
        if (document.cloudinaryPublicId?.endsWith('.pdf.pdf')) {
          newPublicId = document.cloudinaryPublicId.replace('.pdf.pdf', '.pdf');
        }
        
        // Generate new URL with correct resource type
        newCloudinaryUrl = cloudinaryService.generateDocumentUrl(newPublicId!, document.fileType);
      }
      
      // Issue 2: Wrong resource type (image/upload instead of raw/upload for PDFs)
      if (document.cloudinaryUrl.includes('/image/upload/') && document.fileType === 'pdf') {
        needsRepair = true;
        repairActions.push('Fixed resource type from image to raw for PDF');
        
        // Generate new URL with correct resource type
        newCloudinaryUrl = cloudinaryService.generateDocumentUrl(document.cloudinaryPublicId!, document.fileType);
      }
    }

    if (needsRepair) {
      console.log('Repairing document with actions:', repairActions);
      
      // Update the document in database
      await db.client.document.update({
        where: { id: documentId },
        data: {
          cloudinaryUrl: newCloudinaryUrl,
          cloudinaryPublicId: newPublicId,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Document repaired successfully',
        repairActions,
        oldUrl: document.cloudinaryUrl,
        newUrl: newCloudinaryUrl,
        oldPublicId: document.cloudinaryPublicId,
        newPublicId: newPublicId
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No repairs needed',
        analysis: {
          hasCloudinaryUrl: !!document.cloudinaryUrl,
          hasPublicId: !!document.cloudinaryPublicId,
          urlFormat: document.cloudinaryUrl ? 'appears correct' : 'missing',
          fileType: document.fileType
        }
      });
    }

  } catch (error) {
    console.error('Error repairing document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to repair document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});