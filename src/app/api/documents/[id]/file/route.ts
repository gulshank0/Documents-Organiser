import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any,
  { params }: { params: { id: string } }
) => {
  try {
    const documentId = params.id;
    console.log('File endpoint called for document:', documentId, 'by user:', user.id);
    
    // Get document from database using your existing database system
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
      originalPath: document.originalPath,
      mimeType: document.mimeType
    });

    // Check if user has access to this document
    if (document.userId !== user.id) {
      console.log('Access denied - document owner:', document.userId, 'requesting user:', user.id);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Try multiple possible file locations
    const possiblePaths = [
      // Current path as stored in database
      path.join(process.cwd(), document.originalPath),
      // Remove leading slash if present
      path.join(process.cwd(), document.originalPath.replace(/^\//, '')),
      // Try web_upload directory (where many of your files are)
      path.join(process.cwd(), 'uploads', 'web_upload', document.filename),
      // Try web directory
      path.join(process.cwd(), 'uploads', 'web', document.filename),
      // Try user-specific directory
      path.join(process.cwd(), 'uploads', 'users', document.userId, document.filename),
    ];

    let filePath = null;
    let actualPath = '';

    // Check each possible path until we find the file
    for (const tryPath of possiblePaths) {
      console.log('Checking path:', tryPath);
      if (fs.existsSync(tryPath)) {
        filePath = tryPath;
        actualPath = tryPath;
        console.log('File found at:', actualPath);
        break;
      }
    }

    if (!filePath) {
      console.log('File not found in any of these locations:');
      possiblePaths.forEach(p => console.log('  -', p));
      
      // List contents of upload directories to help debug
      try {
        const webUploadDir = path.join(process.cwd(), 'uploads', 'web_upload');
        if (fs.existsSync(webUploadDir)) {
          console.log('Files in web_upload:', fs.readdirSync(webUploadDir));
        }
        
        const webDir = path.join(process.cwd(), 'uploads', 'web');
        if (fs.existsSync(webDir)) {
          console.log('Files in web:', fs.readdirSync(webDir));
        }
      } catch (dirError) {
        console.log('Cannot read upload directories:', dirError);
      }
      
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    console.log('File exists, reading file...');
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    console.log('File read successfully, size:', fileBuffer.length, 'bytes');
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', document.mimeType || 'application/octet-stream');
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Cache-Control', 'public, max-age=3600');
    
    // For inline display (not download)
    headers.set('Content-Disposition', `inline; filename="${document.filename}"`);

    console.log('Returning file with headers:', Object.fromEntries(headers.entries()));
    return new NextResponse(fileBuffer, { headers });

  } catch (error) {
    console.error('Error serving document file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to serve document file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});