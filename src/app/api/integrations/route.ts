import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { IntegrationType } from '@prisma/client';

// Get user's integrations
export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const db = getDatabase();
    const integrations = await db.getUserIntegrations(user.id);

    // Transform integrations to include status and mask sensitive data
    const safeIntegrations = integrations.map(integration => ({
      id: integration.id,
      type: integration.type,
      name: integration.name,
      isActive: integration.isActive,
      is_active: integration.isActive, // Add alias for compatibility
      lastSync: integration.lastSync,
      last_sync: integration.lastSync, // Add alias for compatibility
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      // Mask tokens for security
      hasAccessToken: !!integration.accessToken,
      hasRefreshToken: !!integration.refreshToken,
      expiresAt: integration.expiresAt,
      // Public settings only
      settings: {
        ...integration.settings,
        // Remove any sensitive data from settings
        clientSecret: undefined,
        privateKey: undefined,
        password: undefined
      }
    }));

    return NextResponse.json(safeIntegrations);

  } catch (error: any) {
    console.error('Integrations API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch integrations',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// Create or update integration
export const POST = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.type || !data.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: type, name' 
        },
        { status: 400 }
      );
    }

    // Validate integration type
    if (!Object.values(IntegrationType).includes(data.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid integration type',
          supportedTypes: Object.values(IntegrationType)
        },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Validate integration-specific requirements
    const validationResult = validateIntegrationData(data.type, data);
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validationResult.error,
          requirements: validationResult.requirements
        },
        { status: 400 }
      );
    }

    // Parse expiration date if provided
    let expiresAt: Date | undefined;
    if (data.expiresAt) {
      expiresAt = new Date(data.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid expiration date format' 
          },
          { status: 400 }
        );
      }
    }

    await db.createUserIntegration({
      userId: user.id,
      type: data.type,
      name: data.name,
      settings: data.settings || {},
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt
    });

    return NextResponse.json({
      success: true,
      message: `${data.type} integration configured successfully`,
      data: {
        type: data.type,
        name: data.name,
        isActive: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create integration',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// Validate integration-specific data
function validateIntegrationData(type: IntegrationType, data: any): {
  valid: boolean;
  error?: string;
  requirements?: string[];
} {
  switch (type) {
    case IntegrationType.GMAIL:
      if (!data.settings?.email) {
        return {
          valid: false,
          error: 'Gmail integration requires email address',
          requirements: ['settings.email']
        };
      }
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'Gmail integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    case IntegrationType.GOOGLE_DRIVE:
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'Google Drive integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    case IntegrationType.DROPBOX:
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'Dropbox integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    case IntegrationType.SHAREPOINT:
      if (!data.settings?.tenantId || !data.settings?.siteUrl) {
        return {
          valid: false,
          error: 'SharePoint integration requires tenant ID and site URL',
          requirements: ['settings.tenantId', 'settings.siteUrl']
        };
      }
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'SharePoint integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    case IntegrationType.SLACK:
      if (!data.settings?.workspaceId) {
        return {
          valid: false,
          error: 'Slack integration requires workspace ID',
          requirements: ['settings.workspaceId']
        };
      }
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'Slack integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    case IntegrationType.TEAMS:
      if (!data.settings?.tenantId) {
        return {
          valid: false,
          error: 'Teams integration requires tenant ID',
          requirements: ['settings.tenantId']
        };
      }
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'Teams integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    case IntegrationType.WHATSAPP:
      if (!data.settings?.phoneNumber) {
        return {
          valid: false,
          error: 'WhatsApp integration requires phone number',
          requirements: ['settings.phoneNumber']
        };
      }
      if (!data.settings?.webhookUrl) {
        return {
          valid: false,
          error: 'WhatsApp integration requires webhook URL',
          requirements: ['settings.webhookUrl']
        };
      }
      break;

    case IntegrationType.OUTLOOK:
      if (!data.settings?.email) {
        return {
          valid: false,
          error: 'Outlook integration requires email address',
          requirements: ['settings.email']
        };
      }
      if (!data.accessToken) {
        return {
          valid: false,
          error: 'Outlook integration requires access token',
          requirements: ['accessToken']
        };
      }
      break;

    default:
      return {
        valid: false,
        error: 'Unsupported integration type'
      };
  }

  return { valid: true };
}