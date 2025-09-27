import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { serializeBigInt } from '@/lib/utils';

export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const db = getDatabase();
    const organizationId = user.organizations?.[0]?.organizationId || null;

    // Get dashboard data with user context
    const rawDashboardData = await db.getDashboardData(user.id, organizationId || undefined);
    
    // Get today's document count using a public method
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create a search request for today's documents
    const documentsToday = await db.searchDocuments({
      query: '',
      dateFrom: today.toISOString(),
      dateTo: tomorrow.toISOString(),
      limit: 1000,
      offset: 0
    }, user.id);

    // Transform the data to match frontend expectations
    const dashboardData = {
      stats: {
        totalDocuments: rawDashboardData.totalDocuments || 0,
        processingQueue: rawDashboardData.processingQueue || 0,
        documentsToday: documentsToday.total,
        averageProcessingTime: 2.5, // Mock value for now
        systemHealth: 'healthy',
        activeConnections: 1
      },
      charts: {
        byDepartment: rawDashboardData.departmentStats || {},
        byStatus: {
          'COMPLETED': (rawDashboardData.totalDocuments || 0) - (rawDashboardData.processingQueue || 0) - (rawDashboardData.failedDocuments || 0),
          'PROCESSING': rawDashboardData.processingQueue || 0,
          'FAILED': rawDashboardData.failedDocuments || 0
        },
        recentActivity: []
      },
      recentDocuments: rawDashboardData.recentUploads || [],
      alerts: rawDashboardData.alerts || [],
      cached: false,
      timestamp: new Date().toISOString()
    };

    // Add user-specific data
    const enhancedDashboardData = {
      ...dashboardData,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        profession: user.profession,
        currentOrganization: organizationId
      },
      organizationInfo: organizationId ? await getOrganizationInfo(organizationId) : null,
      systemHealth: await getSystemHealth(),
      permissions: await getUserDashboardPermissions(user.id, organizationId || undefined)
    };

    // Serialize BigInt values before returning
    const serializedDashboardData = serializeBigInt(enhancedDashboardData);

    return NextResponse.json(serializedDashboardData);

  } catch (error: any) {
    console.error('Dashboard data error:', error);
    
    // Return fallback data instead of throwing error
    const fallbackData = {
      stats: {
        totalDocuments: 0,
        processingQueue: 0,
        documentsToday: 0,
        averageProcessingTime: 0,
        systemHealth: 'disconnected',
        activeConnections: 0
      },
      charts: {
        byDepartment: {},
        byStatus: {},
        recentActivity: []
      },
      recentDocuments: [],
      alerts: [{
        id: 'fallback-alert',
        type: 'warning',
        title: 'Limited Functionality',
        message: 'Dashboard is running in limited mode due to connection issues.'
      }],
      fallback: true,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(fallbackData);
  }
});

// Get organization information for dashboard
async function getOrganizationInfo(organizationId: string) {
  try {
    // For now, return mock data until we can create a proper public method
    return {
      id: organizationId,
      name: 'Organization',
      type: 'BUSINESS',
      memberCount: 1,
      documentCount: 0,
      folderCount: 0,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error fetching organization info:', error);
    return null;
  }
}

// Get system health status
async function getSystemHealth() {
  try {
    const db = getDatabase();
    const isConnected = await db.testConnection();
    
    return {
      status: isConnected ? 'healthy' : 'degraded',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error checking system health:', error);
    return {
      status: 'error',
      database: 'error',
      timestamp: new Date().toISOString()
    };
  }
}

// Get user's dashboard permissions
async function getUserDashboardPermissions(userId: string, organizationId?: string) {
  try {
    const db = getDatabase();
    const permissions = await db.getUserPermissions(userId, organizationId);
    
    return {
      canCreateDocuments: true,
      canCreateFolders: true,
      canManageOrganization: permissions.role === 'OWNER' || permissions.role === 'ADMIN',
      canInviteUsers: permissions.role === 'OWNER' || permissions.role === 'ADMIN' || permissions.role === 'MANAGER',
      canViewAnalytics: true,
      canManageIntegrations: true
    };
  } catch (error) {
    console.error('Error getting dashboard permissions:', error);
    return {
      canCreateDocuments: true,
      canCreateFolders: true,
      canManageOrganization: false,
      canInviteUsers: false,
      canViewAnalytics: true,
      canManageIntegrations: true
    };
  }
}