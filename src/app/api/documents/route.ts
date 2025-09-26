import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const department = searchParams.get('department') || undefined;
    const status = searchParams.get('status') || undefined;

    const db = getDatabase();
    
    // Test database connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const documents = await db.getDocuments({ skip, limit, department, status });
    
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch documents', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}