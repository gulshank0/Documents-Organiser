import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { cloudinaryService } from '@/lib/cloudinary';

export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: documentId } = await params;
    console.log('File endpoint called for document:', documentId, 'by user:', user.id);
    
    // Get document from database
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    
    console.log('Fetching document from database...');
    const document = await db.getDocumentById(documentId, user.id);

    if (!document) {
      console.log('Document not found in database for ID:', documentId);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    console.log('Document found:', {
      id: document.id,
      filename: document.filename,
      userId: document.userId,
      cloudinaryUrl: document.cloudinaryUrl,
      cloudinaryPublicId: document.cloudinaryPublicId,
      mimeType: document.mimeType,
      fileType: document.fileType
    });

    // Check if user has access to this document
    if (document.userId !== user.id) {
      console.log('Access denied - document owner:', document.userId, 'requesting user:', user.id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Auto-repair corrupted Cloudinary URLs
    let needsRepair = false;
    let repairedUrl = document.cloudinaryUrl;
    let repairedPublicId = document.cloudinaryPublicId;

    if (document.cloudinaryUrl && document.cloudinaryPublicId) {
      // Check for common corruption patterns
      const isCorrupted = 
        document.cloudinaryUrl.includes('.pdf.pdf') ||
        document.cloudinaryUrl.includes('.docx.docx') ||
        document.cloudinaryUrl.includes('.doc.doc') ||
        (document.cloudinaryUrl.includes('/image/upload/') && ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(document.fileType?.toLowerCase() || ''));

      if (isCorrupted) {
        console.log('🔧 Detected corrupted Cloudinary URL, attempting repair...');
        needsRepair = true;

        try {
          // Clean up the public ID
          repairedPublicId = document.cloudinaryPublicId
            ?.replace(/\.pdf\.pdf$/, '.pdf')
            ?.replace(/\.docx\.docx$/, '.docx')
            ?.replace(/\.doc\.doc$/, '.doc')
            ?.replace(/\.xlsx\.xlsx$/, '.xlsx')
            ?.replace(/\.xls\.xls$/, '.xls')
            ?.replace(/\.pptx\.pptx$/, '.pptx')
            ?.replace(/\.ppt\.ppt$/, '.ppt');

          // Generate proper URL using the cloudinary service
          if (repairedPublicId) {
            repairedUrl = cloudinaryService.generateDocumentUrl(repairedPublicId, document.fileType?.toLowerCase() || 'pdf');
            console.log('✅ Generated repaired URL:', repairedUrl);
          }
        } catch (repairError) {
          console.error('❌ Failed to repair URL:', repairError);
          needsRepair = false; // Use original URLs if repair fails
        }
      }
    }

    // If document has Cloudinary URL, try to serve it
    if (document.cloudinaryUrl && document.cloudinaryPublicId) {
      console.log('Attempting to serve from Cloudinary URL:', repairedUrl || document.cloudinaryUrl);
      
      try {
        // Use repaired URL if available, otherwise use original
        const deliveryUrl = repairedUrl || document.cloudinaryUrl;
        
        // Fetch the file from Cloudinary with proper headers and timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(deliveryUrl, {
          headers: {
            'User-Agent': 'DocumentOrganizer/1.0',
            'Accept': '*/*',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`❌ Cloudinary fetch failed: ${response.status} ${response.statusText}`);
          
          // If it's a 404 and we haven't tried repair yet, attempt repair
          if (response.status === 404 && !needsRepair && document.cloudinaryUrl) {
            console.log('🔄 Attempting emergency URL repair for 404...');
            
            try {
              const emergencyPublicId = document.cloudinaryPublicId
                ?.replace(/\.pdf\.pdf$/, '.pdf')
                ?.replace(/\.docx\.docx$/, '.docx')
                ?.replace(/\.doc\.doc$/, '.doc');
              
              if (emergencyPublicId) {
                const emergencyUrl = cloudinaryService.generateDocumentUrl(emergencyPublicId, document.fileType?.toLowerCase() || 'pdf');
                console.log('🆘 Trying emergency URL:', emergencyUrl);
                
                const emergencyResponse = await fetch(emergencyUrl, {
                  headers: {
                    'User-Agent': 'DocumentOrganizer/1.0',
                    'Accept': '*/*',
                  },
                  signal: controller.signal,
                });

                if (emergencyResponse.ok) {
                  console.log('✅ Emergency repair successful!');
                  const fileBuffer = await emergencyResponse.arrayBuffer();
                  
                  // Update the database with the corrected URLs
                  try {
                    await db.client.document.update({
                      where: { id: documentId },
                      data: {
                        cloudinaryUrl: emergencyUrl,
                        cloudinaryPublicId: emergencyPublicId,
                      }
                    });
                    console.log('📝 Database updated with corrected URLs');
                  } catch (updateError) {
                    console.error('⚠️ Failed to update database with corrected URLs:', updateError);
                  }

                  // Return the file
                  const headers = new Headers();
                  headers.set('Content-Type', document.mimeType || 'application/octet-stream');
                  headers.set('Content-Length', fileBuffer.byteLength.toString());
                  headers.set('Cache-Control', 'public, max-age=3600');
                  headers.set('Content-Disposition', `inline; filename="${document.filename}"`);
                  headers.set('Access-Control-Allow-Origin', '*');
                  headers.set('Access-Control-Allow-Methods', 'GET');
                  headers.set('Access-Control-Allow-Headers', 'Content-Type');

                  return new NextResponse(fileBuffer, { headers });
                }
              }
            } catch (emergencyError) {
              console.error('🆘 Emergency repair also failed:', emergencyError);
            }
          }
          
          // If it's a 404, the file might not exist in Cloudinary
          if (response.status === 404) {
            throw new Error(`File not found in Cloudinary (404). The file may need to be re-uploaded.`);
          }
          
          throw new Error(`Failed to fetch from Cloudinary: ${response.status} ${response.statusText}`);
        }

        const fileBuffer = await response.arrayBuffer();
        console.log('✅ File fetched from Cloudinary successfully, size:', fileBuffer.byteLength, 'bytes');
        
        // If we used a repaired URL and it worked, update the database
        if (needsRepair && repairedUrl && repairedPublicId) {
          try {
            await db.client.document.update({
              where: { id: documentId },
              data: {
                cloudinaryUrl: repairedUrl,
                cloudinaryPublicId: repairedPublicId,
              }
            });
            console.log('📝 Database updated with repaired URLs');
          } catch (updateError) {
            console.error('⚠️ Failed to update database with repaired URLs:', updateError);
          }
        }
        
        // Set appropriate headers for the response
        const headers = new Headers();
        headers.set('Content-Type', document.mimeType || 'application/octet-stream');
        headers.set('Content-Length', fileBuffer.byteLength.toString());
        headers.set('Cache-Control', 'public, max-age=3600');
        
        // For inline display (not download) - important for PDF preview
        headers.set('Content-Disposition', `inline; filename="${document.filename}"`);
        
        // Add CORS headers for better browser compatibility
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Methods', 'GET');
        headers.set('Access-Control-Allow-Headers', 'Content-Type');

        console.log('📤 Returning file with headers:', Object.fromEntries(headers.entries()));
        return new NextResponse(fileBuffer, { headers });

      } catch (cloudinaryError) {
        console.error('❌ Error fetching from Cloudinary:', cloudinaryError);
        
        // Log more details about the error
        if (cloudinaryError instanceof Error) {
          console.error('Cloudinary error details:', {
            message: cloudinaryError.message,
            stack: cloudinaryError.stack
          });
        }
        
        // Don't immediately fail - try local storage fallback
        console.log('🔄 Cloudinary failed, attempting local storage fallback...');
      }
    }

    // Fallback: check for legacy local file storage
    console.log('Checking legacy local storage...');
    
    const fs = await import('fs');
    const path = await import('path');

    // Try multiple possible file locations for backward compatibility
    const possiblePaths = [
      // Current path as stored in database
      document.originalPath && path.join(process.cwd(), document.originalPath),
      // Remove leading slash if present
      document.originalPath && path.join(process.cwd(), document.originalPath.replace(/^\//, '')),
      // Try web_upload directory (where many files are located based on your structure)
      path.join(process.cwd(), 'uploads', 'web_upload', document.filename),
      // Try variations of the filename
      path.join(process.cwd(), 'uploads', 'web_upload', document.filename.replace(/\s+/g, '-')),
      path.join(process.cwd(), 'uploads', 'web_upload', document.filename.replace(/\s+/g, '_')),
      // Try web directory
      path.join(process.cwd(), 'uploads', 'web', document.filename),
      // Try user-specific directory
      path.join(process.cwd(), 'uploads', 'users', document.userId, document.filename),
    ].filter(Boolean); // Remove null/undefined paths

    console.log('Checking possible file paths:', possiblePaths);

    let filePath = null;
    let actualPath = '';

    // Check each possible path until we find the file
    for (const tryPath of possiblePaths) {
      console.log('Checking path:', tryPath);
      try {
        if (fs.default.existsSync(tryPath as string)) {
          filePath = tryPath;
          actualPath = tryPath as string;
          console.log('File found at:', actualPath);
          break;
        }
      } catch (fsError) {
        console.error(`Error checking path ${tryPath}:`, fsError);
        continue;
      }
    }

    if (!filePath) {
      console.log('File not found in any location');
      
      // Provide comprehensive error information and suggestions
      const errorResponse = {
        error: 'File not accessible',
        details: document.cloudinaryUrl 
          ? 'The file could not be retrieved from cloud storage and no local backup was found'
          : 'File not found in local storage',
        suggestions: [
          'The file may need to be re-uploaded',
          'Contact support if this issue persists',
          'Check if the file was migrated to cloud storage',
          ...(document.cloudinaryUrl?.includes('.pdf.pdf') ? ['This file appears to have a corrupted Cloudinary URL'] : [])
        ],
        documentInfo: {
          filename: document.filename,
          fileType: document.fileType,
          hasCloudinaryUrl: !!document.cloudinaryUrl,
          cloudinaryUrlCorrupted: document.cloudinaryUrl?.includes('.pdf.pdf') || false,
          originalPath: document.originalPath,
          searchedPaths: possiblePaths.slice(0, 5) // Show first 5 paths searched
        },
        actions: [
          {
            action: 'reupload',
            description: 'Re-upload this document to fix the issue',
            url: '/upload'
          },
          {
            action: 'contact_support',
            description: 'Contact support for assistance',
            details: `Document ID: ${documentId}, Filename: ${document.filename}`
          }
        ]
      };
      
      return NextResponse.json(errorResponse, { status: 404 });
    }

    console.log('Reading local file...');
    // Read file from local storage
    try {
      const fileBuffer = fs.default.readFileSync(filePath as string);
      console.log('Local file read successfully, size:', fileBuffer.length, 'bytes');
      
      // Set appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', document.mimeType || 'application/octet-stream');
      headers.set('Content-Length', fileBuffer.length.toString());
      headers.set('Cache-Control', 'public, max-age=3600');
      
      // For inline display (not download)
      headers.set('Content-Disposition', `inline; filename="${document.filename}"`);
      
      // Add CORS headers
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');

      console.log('Returning local file with headers:', Object.fromEntries(headers.entries()));
      return new NextResponse(fileBuffer, { headers });
    } catch (readError) {
      console.error('Error reading local file:', readError);
      return NextResponse.json({
        error: 'File read error',
        details: 'File was found but could not be read',
        message: readError instanceof Error ? readError.message : 'Unknown read error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error serving document file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to serve document file',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});