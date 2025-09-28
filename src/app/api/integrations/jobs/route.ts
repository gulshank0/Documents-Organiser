import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedAPIHandler } from '@/lib/auth';

// Job processing service
class IntegrationJobProcessor {
  private db: any;
  private isProcessing = false;
  private maxConcurrentJobs = 5;
  private runningJobs = new Set<string>();

  constructor() {
    this.db = getDatabase();
  }

  // Start processing jobs
  async start() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🚀 Integration job processor started');
    
    // Process jobs every 30 seconds
    const processInterval = setInterval(async () => {
      if (!this.isProcessing) {
        clearInterval(processInterval);
        return;
      }
      
      try {
        await this.processJobs();
      } catch (error) {
        console.error('Error processing jobs:', error);
      }
    }, 30000);
  }

  // Stop processing jobs
  stop() {
    this.isProcessing = false;
    console.log('⏹️ Integration job processor stopped');
  }

  // Process pending jobs
  async processJobs() {
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return; // Max concurrent jobs reached
    }

    // Get pending jobs
    const jobs = await this.db.client.integrationJob.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
        attempts: { lt: 3 } // Direct value instead of prisma.raw
      },
      orderBy: [
        { priority: 'asc' },
        { scheduledAt: 'asc' }
      ],
      take: this.maxConcurrentJobs - this.runningJobs.size,
      include: {
        integration: true
      }
    });

    // Process each job
    for (const job of jobs) {
      if (this.runningJobs.has(job.id)) continue;
      
      this.runningJobs.add(job.id);
      this.processJob(job).finally(() => {
        this.runningJobs.delete(job.id);
      });
    }
  }

  // Process individual job
  private async processJob(job: any) {
    try {
      // Mark job as running
      await this.db.client.integrationJob.update({
        where: { id: job.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          attempts: job.attempts + 1
        }
      });

      let result;
      switch (job.jobType) {
        case 'OAUTH_REFRESH':
          result = await this.refreshOAuthToken(job);
          break;
        case 'SYNC':
          result = await this.syncIntegration(job);
          break;
        case 'WEBHOOK_SETUP':
          result = await this.setupWebhook(job);
          break;
        case 'TEST_CONNECTION':
          result = await this.testConnection(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark job as completed
      await this.db.client.integrationJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result
        }
      });

      console.log(`✅ Job ${job.id} (${job.jobType}) completed successfully`);

    } catch (error) {
      console.error(`❌ Job ${job.id} (${job.jobType}) failed:`, error);

      const shouldRetry = job.attempts < job.maxAttempts;
      const nextAttemptDelay = Math.min(Math.pow(2, job.attempts) * 60000, 3600000); // Exponential backoff, max 1 hour

      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.db.client.integrationJob.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'PENDING' : 'FAILED',
          scheduledAt: shouldRetry ? new Date(Date.now() + nextAttemptDelay) : undefined,
          error: errorMessage,
          result: shouldRetry ? null : { error: errorMessage, failedAt: new Date() }
        }
      });
    }
  }

  // Refresh OAuth token
  private async refreshOAuthToken(job: any) {
    const { integration } = job;
    const { type, refreshToken, settings } = integration;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    let tokenResponse;
    switch (type) {
      case 'GMAIL':
      case 'GOOGLE_DRIVE':
        tokenResponse = await this.refreshGoogleToken(refreshToken, settings);
        break;
      case 'OUTLOOK':
      case 'TEAMS':
        tokenResponse = await this.refreshMicrosoftToken(refreshToken, settings);
        break;
      case 'DROPBOX':
        tokenResponse = await this.refreshDropboxToken(refreshToken, settings);
        break;
      default:
        throw new Error(`OAuth refresh not supported for ${type}`);
    }

    // Update integration with new tokens
    await this.db.client.userIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || refreshToken,
        expiresAt: tokenResponse.expires_in 
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : undefined
      }
    });

    return { 
      success: true, 
      tokenRefreshed: true,
      expiresIn: tokenResponse.expires_in 
    };
  }

  // Sync integration data
  private async syncIntegration(job: any) {
    const { integration } = job;
    const { type } = integration;

    switch (type) {
      case 'GMAIL':
        return await this.syncGmail(integration);
      case 'GOOGLE_DRIVE':
        return await this.syncGoogleDrive(integration);
      case 'DROPBOX':
        return await this.syncDropbox(integration);
      case 'SLACK':
        return await this.syncSlack(integration);
      default:
        throw new Error(`Sync not implemented for ${type}`);
    }
  }

  // Setup webhook for integration
  private async setupWebhook(job: any) {
    const { integration } = job;
    const { type, settings } = integration;

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${type.toLowerCase()}`;

    switch (type) {
      case 'TELEGRAM':
        return await this.setupTelegramWebhook(integration, webhookUrl);
      case 'WHATSAPP':
        return await this.setupWhatsAppWebhook(integration, webhookUrl);
      case 'SLACK':
        return await this.setupSlackWebhook(integration, webhookUrl);
      default:
        throw new Error(`Webhook setup not supported for ${type}`);
    }
  }

  // Test integration connection
  private async testConnection(job: any) {
    const { integration } = job;
    const { type, accessToken, settings } = integration;

    switch (type) {
      case 'TELEGRAM':
        return await this.testTelegramConnection(settings.bot_token);
      case 'WHATSAPP':
        return await this.testWhatsAppConnection(accessToken, settings);
      case 'GMAIL':
        return await this.testGmailConnection(accessToken);
      case 'SLACK':
        return await this.testSlackConnection(accessToken);
      default:
        return { success: true, message: 'Connection test not implemented' };
    }
  }

  // OAuth token refresh implementations
  private async refreshGoogleToken(refreshToken: string, settings: any) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!
      })
    });

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async refreshMicrosoftToken(refreshToken: string, settings: any) {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default'
      })
    });

    if (!response.ok) {
      throw new Error(`Microsoft token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private async refreshDropboxToken(refreshToken: string, settings: any) {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.DROPBOX_CLIENT_ID!,
        client_secret: process.env.DROPBOX_CLIENT_SECRET!
      })
    });

    if (!response.ok) {
      throw new Error(`Dropbox token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // Sync implementations (simplified)
  private async syncGmail(integration: any) {
    // Implementation would fetch emails with attachments
    return { success: true, documentsFound: 0 };
  }

  private async syncGoogleDrive(integration: any) {
    // Implementation would sync files from Google Drive
    return { success: true, documentsFound: 0 };
  }

  private async syncDropbox(integration: any) {
    // Implementation would sync files from Dropbox
    return { success: true, documentsFound: 0 };
  }

  private async syncSlack(integration: any) {
    // Implementation would fetch shared files from Slack
    return { success: true, documentsFound: 0 };
  }

  // Webhook setup implementations
  private async setupTelegramWebhook(integration: any, webhookUrl: string) {
    const { bot_token } = integration.settings;
    
    const response = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'channel_post'],
        drop_pending_updates: true
      })
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Telegram webhook setup failed: ${result.description}`);
    }

    return { success: true, webhookUrl };
  }

  private async setupWhatsAppWebhook(integration: any, webhookUrl: string) {
    // WhatsApp webhook setup is done through Facebook Developer Console
    // This would typically update the webhook URL in their system
    return { success: true, webhookUrl, note: 'Configure webhook URL in Facebook Developer Console' };
  }

  private async setupSlackWebhook(integration: any, webhookUrl: string) {
    // Slack webhook setup would be done through their API
    return { success: true, webhookUrl };
  }

  // Connection test implementations
  private async testTelegramConnection(botToken: string) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram connection test failed: ${result.description}`);
    }

    return { 
      success: true, 
      botInfo: {
        id: result.result.id,
        username: result.result.username,
        first_name: result.result.first_name
      }
    };
  }

  private async testWhatsAppConnection(accessToken: string, settings: any) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${settings.phone_number_id}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      throw new Error(`WhatsApp connection test failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, phoneInfo: result };
  }

  private async testGmailConnection(accessToken: string) {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error(`Gmail connection test failed: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, profile: result };
  }

  private async testSlackConnection(accessToken: string) {
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Slack connection test failed: ${result.error}`);
    }

    return { success: true, team: result };
  }
}

// Global job processor instance
let globalJobProcessor: IntegrationJobProcessor | null = null;

// Job processor management functions (not exported as API routes)
function startJobProcessor() {
  if (!globalJobProcessor) {
    globalJobProcessor = new IntegrationJobProcessor();
    globalJobProcessor.start();
  }
  return globalJobProcessor;
}

function stopJobProcessor() {
  if (globalJobProcessor) {
    globalJobProcessor.stop();
    globalJobProcessor = null;
  }
}

// API endpoints for job management
export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any
) => {
  try {
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const status = searchParams.get('status');
    const jobType = searchParams.get('jobType');

    const db = getDatabase();
    
    const where: any = {};
    if (integrationId) where.integrationId = integrationId;
    if (status) where.status = status;
    if (jobType) where.jobType = jobType;

    // Only show jobs for user's integrations
    where.integration = { userId: user.id };

    const jobs = await db.client.integrationJob.findMany({
      where,
      include: {
        integration: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({
      success: true,
      jobs: jobs.map(job => ({
        id: job.id,
        integrationId: job.integrationId,
        integration: job.integration,
        jobType: job.jobType,
        status: job.status,
        priority: job.priority,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        scheduledAt: job.scheduledAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        result: job.result,
        createdAt: job.createdAt
      }))
    });

  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch jobs',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});

// Create a new job
export const POST = createAuthenticatedAPIHandler(async (
  request: NextRequest,
  user: any,
  authUser: any
) => {
  try {
    const data = await request.json();
    const { integrationId, jobType, priority = 5, data: jobData, scheduledAt } = data;

    if (!integrationId || !jobType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: integrationId, jobType' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Verify integration ownership
    const integration = await db.client.userIntegration.findFirst({
      where: { id: integrationId, userId: user.id }
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found or access denied' },
        { status: 404 }
      );
    }

    // Create job
    const job = await db.client.integrationJob.create({
      data: {
        integrationId,
        jobType,
        priority,
        data: jobData,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Job created successfully',
      job: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        scheduledAt: job.scheduledAt
      }
    });

  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create job',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
});