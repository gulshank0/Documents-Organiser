import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Fetching document with ID:', params.id);
    
    const db = getDatabase();
    const document = await db.getDocumentById(params.id);
    
    if (!document) {
      console.log('Document not found:', params.id);
      return NextResponse.json(
        { error: 'Document not found' }, 
        { status: 404 }
      );
    }
    
    console.log('Document found:', document.filename);
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedDocument = {
      ...document,
      file_size: document.file_size ? document.file_size.toString() : null,
      // Convert any other potentially problematic fields
      id: document.id.toString(),
      folder_id: document.folder_id ? document.folder_id.toString() : null,
      download_count: document.download_count ? document.download_count.toString() : null
    };
    
    return NextResponse.json(serializedDocument);
    
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' }, 
      { status: 500 }
    );
  }
}