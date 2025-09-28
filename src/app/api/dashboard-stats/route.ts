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

    // Get basic document statistics
    const stats = await db.client.document.aggregate({
      _count: { id: true },
      _sum: { fileSize: true }
    });

    const statusCounts = await db.client.document.groupBy({
      by: ['status'],
      _count: true
    });

    const recentCount = await db.client.document.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const departmentCounts = await db.client.document.groupBy({
      by: ['department'],
      _count: true
    });

    // Transform the data to match expected format
    const statusBreakdown = Object.fromEntries(
      statusCounts.map(stat => [stat.status, stat._count])
    );

    const departmentStats = Object.fromEntries(
      departmentCounts.map(stat => [stat.department || 'UNKNOWN', stat._count])
    );
    
    const response = {
      totalDocuments: stats._count.id || 0,
      processingQueue: statusBreakdown['PROCESSING'] || 0,
      documentsToday: recentCount,
      averageProcessingTime: calculateAverageProcessingTime(statusBreakdown),
      systemHealth: determineSystemHealth(statusBreakdown, stats._count.id || 0),
      activeConnections: 1,
      departments: Object.keys(departmentStats),
      statusBreakdown,
      departmentStats: departmentStats,
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
function calculateAverageProcessingTime(statusBreakdown: Record<string, number>): number {
  const totalDocs = Object.values(statusBreakdown).reduce((sum, count) => sum + count, 0);
  if (totalDocs === 0) return 0;
  
  const processingDocs = statusBreakdown['PROCESSING'] || 0;
  const completedDocs = statusBreakdown['COMPLETED'] || 0;
  
  // Estimate based on processing load
  if (processingDocs > completedDocs * 0.1) {
    return 120; // Higher processing time when queue is backed up
  }
  
  return 45; // Normal processing time
}

// Helper function to determine system health
function determineSystemHealth(statusBreakdown: Record<string, number>, totalDocs: number): string {
  if (totalDocs === 0) return 'idle';
  
  const failedDocs = statusBreakdown['FAILED'] || 0;
  const processingDocs = statusBreakdown['PROCESSING'] || 0;
  
  const failureRate = failedDocs / totalDocs;
  const processingLoad = processingDocs / totalDocs;
  
  if (failureRate > 0.05) return 'degraded'; // More than 5% failure rate
  if (processingLoad > 0.2) return 'busy'; // More than 20% still processing
  
  return 'healthy';
}