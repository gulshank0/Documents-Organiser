import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import crypto from 'crypto';

// WhatsApp Business API types
interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

interface WhatsAppValue {
  messaging_product: string;
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  context?: {
    from: string;
    id: string;
  };
  text?: {
    body: string;
  };
  image?: WhatsAppMedia;
  document?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  video?: WhatsAppMedia;
  voice?: WhatsAppMedia;
}

interface WhatsAppMedia {
  caption?: string;
  filename?: string;
  id: string;
  mime_type: string;
  sha256: string;
}

interface WhatsAppStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

// Verify WhatsApp webhook signature
function verifyWhatsAppWebhook(body: string, signature: string, appSecret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// Download media from WhatsApp
async function downloadWhatsAppMedia(mediaId: string, accessToken: string): Promise<{
  buffer: Buffer;
  filename: string;
  mimeType: string;
}> {
  try {
    // Get media URL
    const mediaInfoResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!mediaInfoResponse.ok) {
      throw new Error(`Failed to get media info: ${mediaInfoResponse.statusText}`);
    }
    
    const mediaInfo = await mediaInfoResponse.json();
    const mediaUrl = mediaInfo.url;
    
    // Download media
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media: ${mediaResponse.statusText}`);
    }
    
    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
    const filename = mediaInfo.filename || `whatsapp_media_${Date.now()}`;
    const mimeType = mediaInfo.mime_type || 'application/octet-stream';
    
    return { buffer, filename, mimeType };
  } catch (error) {
    console.error('Error downloading WhatsApp media:', error);
    throw error;
  }
}

// Process WhatsApp document
async function processWhatsAppDocument(
  db: any,
  integration: any,
  message: WhatsAppMessage,
  contact: WhatsAppContact | undefined,
  accessToken: string
) {
  const documents = [];
  
  // Handle different media types
  const mediaTypes = ['document', 'image', 'audio', 'video', 'voice'] as const;
  
  for (const mediaType of mediaTypes) {
    const media = message[mediaType];
    if (!media) continue;
    
    try {
      const fileData = await downloadWhatsAppMedia(media.id, accessToken);
      
      // Override filename for document type
      if (mediaType === 'document' && media.filename) {
        fileData.filename = media.filename;
      }
      
      // Upload to Cloudinary
      const cloudinaryService = require('@/lib/cloudinary');
      const uploadResult = await cloudinaryService.uploadDocument(
        fileData.buffer,
        fileData.filename,
        integration.userId,
        null
      );
      
      // Extract file type
      const fileType = fileData.filename.split('.').pop()?.toLowerCase() || mediaType;
      
      // Create document record
      const document = await db.createDocument({
        filename: fileData.filename,
        originalPath: uploadResult.secure_url,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        fileType,
        mimeType: fileData.mimeType,
        fileSize: BigInt(fileData.buffer.length),
        channel: 'WHATSAPP',
        userId: integration.userId,
        organizationId: null,
        metaData: {
          source: 'whatsapp',
          integrationId: integration.id,
          whatsappData: {
            messageId: message.id,
            from: message.from,
            timestamp: message.timestamp,
            mediaType,
            caption: media.caption,
            sha256: media.sha256,
            contact: contact ? {
              name: contact.profile.name,
              waId: contact.wa_id
            } : null
          },
          uploadedAt: new Date().toISOString()
        },
        status: 'PENDING'
      });
      
      // Queue for processing
      await db.prisma.processingQueue.create({
        data: {
          documentId: document.id,
          taskType: 'EXTRACT_AND_ANALYZE',
          priority: 3 // Higher priority for WhatsApp
        }
      });
      
      documents.push(document);
    } catch (error) {
      console.error(`Error processing WhatsApp ${mediaType}:`, error);
      // Continue processing other media types
    }
  }
  
  return documents;
}

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  // Verify webhook subscription
  if (mode === 'subscribe') {
    // You should store the verify token in environment variables
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    if (token === expectedToken) {
      return new NextResponse(challenge, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
    }
  }
  
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// Main webhook handler (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';
    
    // Parse webhook payload
    let payload: WhatsAppWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    // Verify this is a WhatsApp webhook
    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid webhook object' }, { status: 400 });
    }
    
    const db = getDatabase();
    const documentsProcessed = [];
    
    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;
        
        const { value } = change;
        if (!value.messages) continue;
        
        // Find integration by phone number ID
        const integration = await db.prisma.userIntegration.findFirst({
          where: {
            type: 'WHATSAPP',
            isActive: true,
            settings: {
              path: ['phone_number_id'],
              equals: value.metadata.phone_number_id
            }
          }
        });
        
        if (!integration) {
          console.log(`No WhatsApp integration found for phone number ${value.metadata.phone_number_id}`);
          continue;
        }
        
        // Verify webhook signature
        const appSecret = integration.settings?.app_secret;
        if (appSecret && signature) {
          if (!verifyWhatsAppWebhook(body, signature, appSecret)) {
            console.error('Invalid WhatsApp webhook signature');
            continue;
          }
        }
        
        const accessToken = integration.accessToken;
        if (!accessToken) {
          console.error('No access token found for WhatsApp integration');
          continue;
        }
        
        // Process messages
        for (const message of value.messages) {
          // Skip text-only messages
          if (message.type === 'text') continue;
          
          // Find contact info
          const contact = value.contacts?.find(c => c.wa_id === message.from);
          
          try {
            const documents = await processWhatsAppDocument(
              db,
              integration,
              message,
              contact,
              accessToken
            );
            
            documentsProcessed.push(...documents);
          } catch (error) {
            console.error('Error processing WhatsApp message:', error);
            
            // Log error
            await db.prisma.auditLog.create({
              data: {
                userId: integration.userId,
                action: 'INTEGRATION_ERROR',
                resource: 'INTEGRATION',
                resourceId: integration.id,
                details: {
                  source: 'whatsapp',
                  error: error.message,
                  messageId: message.id,
                  from: message.from
                }
              }
            });
          }
        }
        
        // Update integration last sync time
        if (documentsProcessed.length > 0) {
          await db.prisma.userIntegration.update({
            where: { id: integration.id },
            data: { lastSync: new Date() }
          });
          
          // Log successful ingestion
          await db.prisma.auditLog.create({
            data: {
              userId: integration.userId,
              action: 'INTEGRATION_DOCUMENT_INGESTED',
              resource: 'DOCUMENT',
              resourceId: documentsProcessed.map(d => d.id).join(','),
              details: {
                source: 'whatsapp',
                integrationId: integration.id,
                documentsCount: documentsProcessed.length,
                phoneNumberId: value.metadata.phone_number_id
              }
            }
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: documentsProcessed.length,
      documents: documentsProcessed.map(d => ({
        id: d.id,
        filename: d.filename,
        type: d.fileType
      }))
    });
    
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed'
    }, { status: 500 });
  }
}