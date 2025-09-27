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
    
    // Get document from database
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    
    const document = await db.getDocumentById(documentId, user.id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if user has access to this document
    if (document.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get file path
    const filePath = path.join(process.cwd(), document.originalPath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Set headers for download
    const headers = new Headers();
    headers.set('Content-Type', document.mimeType || 'application/octet-stream');
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', `attachment; filename="${document.filename}"`);

    return new NextResponse(fileBuffer, { headers });

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
});