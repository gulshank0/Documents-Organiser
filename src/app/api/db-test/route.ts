import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  try {
    const db = getDatabase();
    
    // Test basic connection
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed',
          status: 'disconnected',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Test query execution
    const userCount = await db.client.user.count();
    const documentCount = await db.client.document.count();
    
    return NextResponse.json({
      success: true,
      status: 'connected',
      statistics: {
        totalUsers: userCount,
        totalDocuments: documentCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Database connection test failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Database connection test failed',
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};