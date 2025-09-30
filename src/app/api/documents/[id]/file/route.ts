import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
        }, 
        { status: 404 }
      );
    }

    // Get the file URL from Cloudinary
    if (!document.cloudinaryPublicId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'File not available',
        }, 
        { status: 404 }
      );
    }

    // Generate a signed URL for secure access
    const resourceType = getResourceType(document.fileType);
    const url = cloudinary.url(document.cloudinaryPublicId, {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      secure: true,
      attachment: false, // Set to false for inline preview
    });

    // For direct file access, redirect to Cloudinary URL
    return NextResponse.redirect(url);
    
  } catch (error: any) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to serve file',
        details: error.message,
      },
      { status: 500 }
    );
  }
});

function getResourceType(fileType: string | null): 'image' | 'video' | 'raw' | 'auto' {
  if (!fileType) return 'raw';
  
  const type = fileType.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'].includes(type)) {
    return 'image';
  }
  
  if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(type)) {
    return 'video';
  }
  
  return 'raw';
}