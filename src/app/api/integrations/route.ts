import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { IntegrationType } from '@prisma/client';

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  store: new Map()
};

// Input sanitization
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>\"']/g, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// Rate limiting middleware
function checkRateLimit(userId: string, ip: string): boolean {
  const key = `${userId}:${ip}`;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  
  if (!RATE_LIMIT.store.has(key)) {
    RATE_LIMIT.store.set(key, []);
  }
  
  const requests = RATE_LIMIT.store.get(key)!.filter((time: number) => time > windowStart);
  
  if (requests.length >= RATE_LIMIT.maxRequests) {
    return false;
  }
  
  requests.push(now);
  RATE_LIMIT.store.set(key, requests);
  return true;
}

// Enhanced audit logging
async function logIntegrationActivity(
  db: any,
  userId: string,
  action: string,
  integrationType: string,
  details?: any,
  status: 'SUCCESS' | 'FAILURE' = 'SUCCESS'
) {
  try {
    await db.client.auditLog.create({
      data: {
        userId,
        action: `INTEGRATION_${action}`,
        resource: 'INTEGRATION',
        resourceId: integrationType,
        details: {
          integrationType,
          status,
          timestamp: new Date().toISOString(),
          ...details
        },
        ipAddress: details?.ipAddress,
        userAgent: details?.userAgent
      }
    });
  } catch (error) {
    console.error('Failed to log integration activity:', error);
  }
}

// Get user's integrations with enhanced filtering and pagination
export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const type = searchParams.get('type') as IntegrationType;
    const status = searchParams.get('status'); // 'active', 'inactive', 'error'
    const search = searchParams.get('search');

    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(user.id, clientIP)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(RATE_LIMIT.windowMs / 1000)
        },
        { status: 429 }
      );
    }

    const db = getDatabase();
    
    // Build filter conditions
    const filters: any = { userId: user.id };
    if (type && Object.values(IntegrationType).includes(type)) {
      filters.type = type;
    }
    if (status === 'active') filters.isActive = true;
    if (status === 'inactive') filters.isActive = false;
    if (search) {
      filters.name = { contains: search, mode: 'insensitive' };
    }

    // Get integrations with pagination
    const [integrations, totalCount] = await Promise.all([
      db.client.userIntegration.findMany({
        where: filters,
        orderBy: [
          { isActive: 'desc' },
          { updatedAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      db.client.userIntegration.count({ where: filters })
    ]);

    // Enhanced transformation with health status
    const safeIntegrations = await Promise.all(
      integrations.map(async (integration) => {
        const healthStatus = await checkIntegrationHealth(integration);
        const stats = await getIntegrationStats(db, integration.id);
        
        return {
          id: integration.id,
          type: integration.type,
          name: integration.name,
          isActive: integration.isActive,
          lastSync: integration.lastSync,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt,
          expiresAt: integration.expiresAt,
          
          // Health and status
          health: healthStatus,
          syncStatus: getSyncStatus(integration),
          documentsImported: stats.documentsImported,
          lastError: stats.lastError,
          
          // Security - mask sensitive data
          hasAccessToken: !!integration.accessToken,
          hasRefreshToken: !!integration.refreshToken,
          tokenExpiresAt: integration.expiresAt,
          
          // Safe settings (remove sensitive fields)
          settings: sanitizeSettings(integration.settings, integration.type)
        };
      })
    );

    // Log successful access
    await logIntegrationActivity(
      db, 
      user.id, 
      'LIST', 
      'ALL', 
      { 
        count: safeIntegrations.length,
        filters,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent')
      }
    );

    return NextResponse.json({
      success: true,
      data: safeIntegrations,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      meta: {
        activeCount: safeIntegrations.filter(i => i.isActive).length,
        totalTypes: new Set(safeIntegrations.map(i => i.type)).size,
        healthySystems: safeIntegrations.filter(i => i.health === 'healthy').length
      }
    });

  } catch (error: any) {
    console.error('Integrations GET error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch integrations',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      },
      { status: 500 }
    );
  }
});

// Create or update integration with comprehensive validation
export const POST = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Rate limiting
    if (!checkRateLimit(user.id, clientIP)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(RATE_LIMIT.windowMs / 1000)
        },
        { status: 429 }
      );
    }

    // Parse and sanitize input
    let data;
    try {
      data = await request.json();
      data = sanitizeInput(data);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON payload' 
        },
        { status: 400 }
      );
    }
    
    // Comprehensive validation
    const validation = await validateIntegrationRequest(data, user.id);
    if (!validation.valid) {
      await logIntegrationActivity(
        getDatabase(), 
        user.id, 
        'CREATE', 
        data.type || 'UNKNOWN', 
        { error: validation.error, ipAddress: clientIP, userAgent },
        'FAILURE'
      );
      
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          requirements: validation.requirements,
          suggestions: validation.suggestions
        },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check for duplicate integrations
    const existingIntegration = await db.client.userIntegration.findFirst({
      where: {
        userId: user.id,
        type: data.type,
        name: data.name
      }
    });

    if (existingIntegration) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Integration with this name and type already exists',
          suggestion: 'Use a different name or update the existing integration'
        },
        { status: 409 }
      );
    }

    // Parse expiration date with validation
    let expiresAt: Date | undefined;
    if (data.expiresAt) {
      expiresAt = new Date(data.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid or past expiration date' 
          },
          { status: 400 }
        );
      }
    }

    // Create integration with enhanced data
    const integration = await db.createUserIntegration({
      userId: user.id,
      type: data.type,
      name: data.name,
      settings: {
        ...data.settings,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        ipAddress: clientIP
      },
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt
    });

    // Test the integration if possible
    const testResult = await testIntegrationConnection(integration, data);

    // Log successful creation
    await logIntegrationActivity(
      db, 
      user.id, 
      'CREATE', 
      data.type, 
      { 
        integrationId: integration.id,
        testResult: testResult.success,
        ipAddress: clientIP,
        userAgent
      }
    );

    return NextResponse.json({
      success: true,
      message: `${data.type} integration configured successfully`,
      data: {
        id: integration.id,
        type: data.type,
        name: data.name,
        isActive: true,
        testResult,
        nextSteps: getNextSteps(data.type)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error creating integration:', error);
    
    // Log the error
    try {
      const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logIntegrationActivity(
        getDatabase(), 
        user.id, 
        'CREATE', 
        'UNKNOWN', 
        { error: error.message, ipAddress: clientIP, userAgent },
        'FAILURE'
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create integration',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      },
      { status: 500 }
    );
  }
});

// Update integration status (PUT method)
export const PUT = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const data = await request.json();
    const { id, isActive, settings } = data;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Verify ownership
    const integration = await db.client.userIntegration.findFirst({
      where: { id, userId: user.id }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found or access denied' },
        { status: 404 }
      );
    }

    // Update integration
    const updatedIntegration = await db.client.userIntegration.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(settings && { settings: { ...integration.settings, ...settings } }),
        updatedAt: new Date()
      }
    });

    // Log the update
    await logIntegrationActivity(
      db, 
      user.id, 
      'UPDATE', 
      integration.type, 
      { 
        integrationId: id,
        changes: { isActive, settings: !!settings },
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Integration updated successfully',
      data: {
        id: updatedIntegration.id,
        isActive: updatedIntegration.isActive
      }
    });

  } catch (error: any) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update integration',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});

// Delete integration (DELETE method)
export const DELETE = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Verify ownership and get integration details
    const integration = await db.client.userIntegration.findFirst({
      where: { id, userId: user.id }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete - mark as inactive first, then delete after grace period
    await db.client.userIntegration.update({
      where: { id },
      data: {
        isActive: false,
        settings: {
          ...integration.settings,
          deletedAt: new Date().toISOString(),
          deletedBy: user.id
        }
      }
    });

    // Schedule actual deletion after 30 days (implement with background job)
    // For now, we'll do immediate deletion in development
    if (process.env.NODE_ENV === 'development') {
      await db.client.userIntegration.delete({
        where: { id }
      });
    }

    // Log the deletion
    await logIntegrationActivity(
      db, 
      user.id, 
      'DELETE', 
      integration.type, 
      { 
        integrationId: id,
        integrationType: integration.type,
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent')
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete integration',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});

// Enhanced validation function
async function validateIntegrationRequest(data: any, userId: string): Promise<{
  valid: boolean;
  error?: string;
  requirements?: string[];
  suggestions?: string[];
}> {
  // Basic validation
  if (!data.type || !data.name) {
    return {
      valid: false,
      error: 'Missing required fields: type, name',
      requirements: ['type', 'name']
    };
  }

  // Validate integration type
  if (!Object.values(IntegrationType).includes(data.type)) {
    return {
      valid: false,
      error: 'Invalid integration type',
      suggestions: Object.values(IntegrationType)
    };
  }

  // Validate name length and format
  if (data.name.length < 3 || data.name.length > 100) {
    return {
      valid: false,
      error: 'Integration name must be between 3 and 100 characters'
    };
  }

  // Integration-specific validation
  const typeValidation = validateIntegrationData(data.type, data);
  if (!typeValidation.valid) {
    return typeValidation;
  }

  return { valid: true };
}

// Enhanced integration-specific validation with Telegram support
function validateIntegrationData(type: IntegrationType, data: any): {
  valid: boolean;
  error?: string;
  requirements?: string[];
  suggestions?: string[];
} {
  switch (type) {
    case IntegrationType.GMAIL:
    case IntegrationType.OUTLOOK:
      if (!data.settings?.email) {
        return {
          valid: false,
          error: `${type} integration requires email address`,
          requirements: ['settings.email']
        };
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.settings.email)) {
        return {
          valid: false,
          error: 'Invalid email address format'
        };
      }
      break;

    case IntegrationType.TELEGRAM:
      if (!data.settings?.bot_token) {
        return {
          valid: false,
          error: 'Telegram integration requires bot token',
          requirements: ['settings.bot_token'],
          suggestions: ['Get bot token from @BotFather on Telegram']
        };
      }
      // Validate bot token format
      const botTokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
      if (!botTokenRegex.test(data.settings.bot_token)) {
        return {
          valid: false,
          error: 'Invalid Telegram bot token format',
          suggestions: ['Bot token should be in format: 123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11']
        };
      }
      if (!data.settings?.chat_id) {
        return {
          valid: false,
          error: 'Telegram integration requires chat ID or channel username',
          requirements: ['settings.chat_id'],
          suggestions: ['Use @username for channels or numeric chat ID for groups']
        };
      }
      break;

    case IntegrationType.WHATSAPP:
      if (!data.settings?.phone_number) {
        return {
          valid: false,
          error: 'WhatsApp integration requires phone number',
          requirements: ['settings.phone_number']
        };
      }
      // Validate phone number format
      const phoneRegex = /^\+\d{10,15}$/;
      if (!phoneRegex.test(data.settings.phone_number)) {
        return {
          valid: false,
          error: 'Invalid phone number format. Use international format: +1234567890'
        };
      }
      break;

    case IntegrationType.SLACK:
      if (!data.settings?.workspace_name) {
        return {
          valid: false,
          error: 'Slack integration requires workspace name',
          requirements: ['settings.workspace_name']
        };
      }
      break;

    case IntegrationType.DROPBOX:
      if (!data.settings?.folder_path) {
        return {
          valid: false,
          error: 'Dropbox integration requires folder path',
          requirements: ['settings.folder_path'],
          suggestions: ['Use format: /Documents or /Shared/ProjectFiles']
        };
      }
      break;

    // OAuth-based integrations that need tokens later
    case IntegrationType.GOOGLE_DRIVE:
    case IntegrationType.SHAREPOINT:
    case IntegrationType.TEAMS:
      // These will be configured through OAuth flow
      break;

    default:
      return {
        valid: false,
        error: 'Unsupported integration type'
      };
  }

  return { valid: true };
}

// Helper functions for enhanced features
async function checkIntegrationHealth(integration: any): Promise<'healthy' | 'warning' | 'error'> {
  // Check token expiration
  if (integration.expiresAt && new Date(integration.expiresAt) <= new Date()) {
    return 'error';
  }
  
  // Check last sync time
  if (integration.lastSync) {
    const daysSinceSync = (Date.now() - new Date(integration.lastSync).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSync > 7) return 'warning';
  }
  
  return 'healthy';
}

async function getIntegrationStats(db: any, integrationId: string) {
  try {
    const stats = await db.client.document.aggregate({
      where: { 
        metaData: {
          path: ['integrationId'],
          equals: integrationId
        }
      },
      _count: true
    });
    
    return {
      documentsImported: stats._count || 0,
      lastError: null // Would be fetched from error logs
    };
  } catch (error) {
    return { documentsImported: 0, lastError: null };
  }
}

function getSyncStatus(integration: any): 'idle' | 'syncing' | 'error' {
  // This would typically check a job queue or sync status
  return integration.isActive ? 'idle' : 'error';
}

function sanitizeSettings(settings: any, type: IntegrationType): any {
  const sanitized = { ...settings };
  
  // Remove sensitive fields based on integration type
  const sensitiveFields = ['bot_token', 'access_token', 'refresh_token', 'client_secret', 'private_key', 'password'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '••••••••';
    }
  });
  
  return sanitized;
}

async function testIntegrationConnection(integration: any, data: any): Promise<{ success: boolean; message: string }> {
  // This would implement actual connection testing for each integration type
  // For now, return a mock success
  return {
    success: true,
    message: 'Connection test not implemented yet'
  };
}

function getNextSteps(type: IntegrationType): string[] {
  const steps: Record<IntegrationType, string[]> = {
    [IntegrationType.GMAIL]: [
      'Complete OAuth authorization',
      'Select folders to monitor',
      'Configure file type filters'
    ],
    [IntegrationType.TELEGRAM]: [
      'Add your bot to the channel/group',
      'Send /start command to activate bot',
      'Test document sharing'
    ],
    [IntegrationType.WHATSAPP]: [
      'Complete webhook setup',
      'Verify phone number',
      'Test message receiving'
    ],
    [IntegrationType.SLACK]: [
      'Install app to workspace',
      'Configure channel permissions',
      'Test file sharing'
    ],
    [IntegrationType.GOOGLE_DRIVE]: [
      'Authorize Google Drive access',
      'Select folders to sync',
      'Configure sync frequency'
    ],
    [IntegrationType.DROPBOX]: [
      'Authorize Dropbox access',
      'Verify folder permissions',
      'Start initial sync'
    ],
    [IntegrationType.TEAMS]: [
      'Connect to Microsoft 365',
      'Select Teams and channels',
      'Configure document library access'
    ],
    [IntegrationType.OUTLOOK]: [
      'Complete OAuth authorization',
      'Configure inbox rules',
      'Test attachment processing'
    ]
  };
  
  return steps[type] || ['Complete integration setup'];
}