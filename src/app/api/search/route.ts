import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { query, department, file_type, channel, limit = 50, use_semantic = true } = await request.json();

    const db = getDatabase();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const results = await db.searchDocuments(query, {
      department,
      file_type,
      channel,
      limit
    });

    const searchResponse = {
      query,
      total_documents: results.length,
      results: results.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        department: doc.department,
        relevance_score: (doc as any).relevance_score || 0,
        text_preview: doc.extracted_text?.substring(0, 200) + '...' || 'No preview available',
        processed_at: doc.processed_at
      })),
      search_method: use_semantic ? 'semantic' : 'keyword',
      individual_alerts: [],
      summary_alerts: []
    };

    return NextResponse.json(searchResponse);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}