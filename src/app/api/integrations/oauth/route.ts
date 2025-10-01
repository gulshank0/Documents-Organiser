import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';
import { IntegrationType } from '@prisma/client';

// OAuth configuration for different providers
const OAUTH_CONFIGS = {
  GMAIL: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  GOOGLE_DRIVE: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  OUTLOOK: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'https://graph.microsoft.com/Mail.Read offline_access',
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET
  },
  TEAMS: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'https://graph.microsoft.com/Files.Read.All offline_access',
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET
  },
  DROPBOX: {
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
    scope: 'files.metadata.read files.content.read',
    clientId: process.env.DROPBOX_CLIENT_ID,
    clientSecret: process.env.DROPBOX_CLIENT_SECRET
  },
  SLACK: {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scope: 'files:read channels:read groups:read',
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET
  }
};

// Initiate OAuth flow
export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any
) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const integrationType = searchParams.get('type') as IntegrationType;
    const integrationId = searchParams.get('integrationId');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Handle OAuth callback
    if (action === 'callback' && code && state) {
      return await handleOAuthCallback(code, state, user);
    }

    // Initiate OAuth flow
    if (action === 'initiate' && integrationType && integrationId) {
      return await initiateOAuthFlow(integrationType, integrationId, user);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request parameters' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('OAuth flow error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// Initiate OAuth flow
async function initiateOAuthFlow(
  integrationType: IntegrationType,
  integrationId: string,
  user: any
) {
  const config = OAUTH_CONFIGS[integrationType];
  
  if (!config) {
    return NextResponse.json(
      { success: false, error: 'OAuth not supported for this integration type' },
      { status: 400 }
    );
  }

  if (!config.clientId || !config.clientSecret) {
    return NextResponse.json(
      { 
        success: false, 
        error: `OAuth credentials not configured for ${integrationType}. Please set environment variables.` 
      },
      { status: 500 }
    );
  }

  // Verify integration ownership
  const db = getDatabase();
  const integration = await db.client.userIntegration.findFirst({
    where: { id: integrationId, userId: user.id }
  });

  if (!integration) {
    return NextResponse.json(
      { success: false, error: 'Integration not found or access denied' },
      { status: 404 }
    );
  }

  // Generate state parameter (includes integrationId for callback)
  const state = Buffer.from(JSON.stringify({
    integrationId,
    userId: user.id,
    timestamp: Date.now()
  })).toString('base64url');

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/oauth?action=callback`;

  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
    access_type: 'offline', // For refresh tokens (Google)
    prompt: 'consent' // Force consent screen to get refresh token
  });

  const authUrl = `${config.authUrl}?${authParams.toString()}`;

  return NextResponse.json({
    success: true,
    authUrl,
    message: 'Redirect user to this URL to authorize'
  });
}

// Handle OAuth callback
async function handleOAuthCallback(code: string, state: string, user: any) {
  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    const { integrationId, userId } = stateData;

    // Verify user matches
    if (userId !== user.id) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=invalid_user`
      );
    }

    const db = getDatabase();
    
    // Get integration
    const integration = await db.client.userIntegration.findFirst({
      where: { id: integrationId, userId: user.id }
    });

    if (!integration) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=integration_not_found`
      );
    }

    const config = OAUTH_CONFIGS[integration.type as keyof typeof OAUTH_CONFIGS];
    
    if (!config) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=unsupported_type`
      );
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/oauth?action=callback`;
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId!,
      client_secret: config.clientSecret!
    });

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Calculate token expiration
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : undefined;

    // Update integration with tokens
    await db.client.userIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        isActive: true,
        lastSync: new Date()
      }
    });

    // Create a job to setup webhook if applicable
    if (['GMAIL', 'GOOGLE_DRIVE', 'SLACK'].includes(integration.type)) {
      await db.client.integrationJob.create({
        data: {
          integrationId,
          jobType: 'WEBHOOK_SETUP',
          priority: 1,
          scheduledAt: new Date()
        }
      });
    }

    // Create initial sync job
    await db.client.integrationJob.create({
      data: {
        integrationId,
        jobType: 'SYNC',
        priority: 3,
        scheduledAt: new Date(Date.now() + 5000) // Start in 5 seconds
      }
    });

    // Log successful authorization
    await db.client.auditLog.create({
      data: {
        userId: user.id,
        action: 'INTEGRATION_AUTHORIZED',
        resource: 'INTEGRATION',
        resourceId: integrationId,
        details: {
          integrationType: integration.type,
          hasRefreshToken: !!tokens.refresh_token,
          expiresAt
        }
      }
    });

    // Redirect back to integrations page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?success=true&integration=${integration.name}`
    );

  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations?error=callback_failed&details=${encodeURIComponent(error.message)}`
    );
  }
}

// Revoke OAuth access
export const DELETE = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any
) => {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'Missing integrationId' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Get integration
    const integration = await db.client.userIntegration.findFirst({
      where: { id: integrationId, userId: user.id }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found or access denied' },
        { status: 404 }
      );
    }

    // Revoke token at provider
    if (integration.accessToken) {
      await revokeToken(integration.type, integration.accessToken);
    }

    // Clear tokens from database
    await db.client.userIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        isActive: false
      }
    });

    return NextResponse.json({
      success: true,
      message: 'OAuth access revoked successfully'
    });

  } catch (error: any) {
    console.error('OAuth revoke error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});

// Revoke token at provider
async function revokeToken(integrationType: IntegrationType, token: string) {
  try {
    switch (integrationType) {
      case 'GMAIL':
      case 'GOOGLE_DRIVE':
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST'
        });
        break;
      
      case 'DROPBOX':
        await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        break;
      
      // Microsoft and Slack don't have revoke endpoints, tokens expire naturally
      default:
        console.log(`Token revocation not implemented for ${integrationType}`);
    }
  } catch (error) {
    console.error('Failed to revoke token:', error);
    // Don't throw - we still want to clear local tokens
  }
}
