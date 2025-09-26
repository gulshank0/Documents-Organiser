import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Cache configuration for stats
const CACHE_DURATION = 15; // 15 seconds - shorter cache for more real-time stats
let cachedStats: any = null;
let cacheTimestamp = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Check cache first (unless force refresh is requested)
    const now = Date.now();
    if (!forceRefresh && cachedStats && (now - cacheTimestamp) < (CACHE_DURATION * 1000)) {
      return NextResponse.json({
        ...cachedStats,
        cached: true,
        cacheAge: Math.floor((now - cacheTimestamp) / 1000)
      });
    }

    const db = getDatabase();
    
    // Test connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      const fallbackStats = {
        totalDocuments: 0,
        processingQueue: 0,
        documentsToday: 0,
        averageProcessingTime: 0,
        systemHealth: 'disconnected',
        activeConnections: 0,
        error: 'Database connection failed'
      };
      
      return NextResponse.json(fallbackStats, { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Fetch stats efficiently
    const stats = await db.getDocumentStats();
    
    const response = {
      totalDocuments: stats.total_documents,
      processingQueue: stats.by_status?.PROCESSING || 0,
      documentsToday: stats.recent_24h,
      averageProcessingTime: calculateAverageProcessingTime(stats),
      systemHealth: determineSystemHealth(stats),
      activeConnections: 1,
      departments: Object.keys(stats.by_department || {}),
      statusBreakdown: stats.by_status || {},
      timestamp: new Date().toISOString()
    };

    // Cache the response
    cachedStats = response;
    cacheTimestamp = now;

    return NextResponse.json({
      ...response,
      cached: false
    }, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}`
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    
    const errorResponse = {
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error',
      totalDocuments: 0,
      processingQueue: 0,
      documentsToday: 0,
      averageProcessingTime: 0,
      systemHealth: 'error',
      activeConnections: 0,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

// Helper function to calculate average processing time
function calculateAverageProcessingTime(stats: any): number {
  const totalDocs = stats.total_documents;
  if (totalDocs === 0) return 0;
  
  // Simple estimation - in real implementation, you'd calculate from actual processing times
  const processingDocs = stats.by_status?.PROCESSING || 0;
  const completedDocs = stats.by_status?.PROCESSED || stats.by_status?.COMPLETED || 0;
  
  // Estimate based on processing load
  if (processingDocs > completedDocs * 0.1) {
    return 120; // Higher processing time when queue is backed up
  }
  
  return 45; // Normal processing time
}

// Helper function to determine system health
function determineSystemHealth(stats: any): string {
  const totalDocs = stats.total_documents;
  const failedDocs = stats.by_status?.FAILED || 0;
  const processingDocs = stats.by_status?.PROCESSING || 0;
  
  if (totalDocs === 0) return 'idle';
  
  const failureRate = failedDocs / totalDocs;
  const processingLoad = processingDocs / totalDocs;
  
  if (failureRate > 0.05) return 'degraded'; // More than 5% failure rate
  if (processingLoad > 0.2) return 'busy'; // More than 20% still processing
  
  return 'healthy';
}