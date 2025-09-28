import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import crypto from 'crypto';

// Telegram Bot API types
interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  document?: TelegramDocument;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  audio?: TelegramAudio;
  voice?: TelegramVoice;
  text?: string;
  caption?: string;
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: TelegramPhotoSize;
}

interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

// Verify Telegram webhook signature
function verifyTelegramWebhook(body: string, signature: string, botToken: string): boolean {
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(body);
  const computedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(computedSignature, 'hex'));
}

// Download file from Telegram
async function downloadTelegramFile(fileId: string, botToken: string): Promise<{
  buffer: Buffer;
  filename: string;
  mimeType: string;
}> {
  try {
    // Get file info
    const fileInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileInfo = await fileInfoResponse.json();
    
    if (!fileInfo.ok) {
      throw new Error(`Failed to get file info: ${fileInfo.description}`);
    }
    
    const filePath = fileInfo.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    
    // Download file
    const fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }
    
    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const filename = filePath.split('/').pop() || `telegram_file_${Date.now()}`;
    const mimeType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    
    return { buffer, filename, mimeType };
  } catch (error) {
    console.error('Error downloading Telegram file:', error);
    throw error;
  }
}

// Process and store document
async function processDocument(
  db: any,
  integration: any,
  fileData: { buffer: Buffer; filename: string; mimeType: string },
  metadata: any
) {
  try {
    // Upload to Cloudinary
    const cloudinaryService = require('@/lib/cloudinary');
    const uploadResult = await cloudinaryService.uploadDocument(
      fileData.buffer,
      fileData.filename,
      integration.userId,
      null // organizationId
    );
    
    // Extract file type
    const fileType = fileData.filename.split('.').pop()?.toLowerCase() || '';
    
    // Create document record
    const document = await db.createDocument({
      filename: fileData.filename,
      originalPath: uploadResult.secure_url,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      fileType,
      mimeType: fileData.mimeType,
      fileSize: BigInt(fileData.buffer.length),
      channel: 'TELEGRAM',
      userId: integration.userId,
      organizationId: null,
      metaData: {
        source: 'telegram',
        integrationId: integration.id,
        telegramData: metadata,
        uploadedAt: new Date().toISOString()
      },
      status: 'PENDING'
    });
    
    // Queue for processing
    await db.prisma.processingQueue.create({
      data: {
        documentId: document.id,
        taskType: 'EXTRACT_AND_ANALYZE',
        priority: 5
      }
    });
    
    return document;
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
}

// Main webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-telegram-bot-api-secret-token') || '';
    
    // Parse update
    let update: TelegramUpdate;
    try {
      update = JSON.parse(body);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    
    const message = update.message || update.channel_post;
    if (!message) {
      return NextResponse.json({ ok: true }); // Ignore non-message updates
    }
    
    const db = getDatabase();
    
    // Find integration by chat ID
    const integration = await db.prisma.userIntegration.findFirst({
      where: {
        type: 'TELEGRAM',
        isActive: true,
        settings: {
          path: ['chat_id'],
          equals: message.chat.id.toString()
        }
      }
    });
    
    if (!integration) {
      console.log(`No active Telegram integration found for chat ${message.chat.id}`);
      return NextResponse.json({ ok: true });
    }
    
    // Verify webhook signature if bot token is available
    const botToken = integration.settings?.bot_token;
    if (botToken && signature) {
      if (!verifyTelegramWebhook(body, signature, botToken)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Process different types of media
    const documentsProcessed = [];
    const metadata = {
      messageId: message.message_id,
      chatId: message.chat.id,
      chatType: message.chat.type,
      chatTitle: message.chat.title,
      fromUser: message.from,
      timestamp: message.date,
      caption: message.caption,
      text: message.text
    };
    
    try {
      // Handle document
      if (message.document) {
        const fileData = await downloadTelegramFile(message.document.file_id, botToken);
        fileData.filename = message.document.file_name || fileData.filename;
        fileData.mimeType = message.document.mime_type || fileData.mimeType;
        
        const document = await processDocument(db, integration, fileData, {
          ...metadata,
          type: 'document',
          originalSize: message.document.file_size
        });
        documentsProcessed.push(document);
      }
      
      // Handle photos
      if (message.photo && message.photo.length > 0) {
        // Get the largest photo
        const largestPhoto = message.photo.reduce((prev, current) => 
          (prev.file_size || 0) > (current.file_size || 0) ? prev : current
        );
        
        const fileData = await downloadTelegramFile(largestPhoto.file_id, botToken);
        fileData.filename = `photo_${message.message_id}.jpg`;
        fileData.mimeType = 'image/jpeg';
        
        const document = await processDocument(db, integration, fileData, {
          ...metadata,
          type: 'photo',
          dimensions: {
            width: largestPhoto.width,
            height: largestPhoto.height
          }
        });
        documentsProcessed.push(document);
      }
      
      // Handle video
      if (message.video) {
        const fileData = await downloadTelegramFile(message.video.file_id, botToken);
        fileData.filename = message.video.file_name || `video_${message.message_id}.mp4`;
        fileData.mimeType = message.video.mime_type || 'video/mp4';
        
        const document = await processDocument(db, integration, fileData, {
          ...metadata,
          type: 'video',
          duration: message.video.duration,
          dimensions: {
            width: message.video.width,
            height: message.video.height
          }
        });
        documentsProcessed.push(document);
      }
      
      // Handle audio
      if (message.audio) {
        const fileData = await downloadTelegramFile(message.audio.file_id, botToken);
        fileData.filename = message.audio.file_name || `audio_${message.message_id}.mp3`;
        fileData.mimeType = message.audio.mime_type || 'audio/mpeg';
        
        const document = await processDocument(db, integration, fileData, {
          ...metadata,
          type: 'audio',
          duration: message.audio.duration,
          performer: message.audio.performer,
          title: message.audio.title
        });
        documentsProcessed.push(document);
      }
      
      // Handle voice message
      if (message.voice) {
        const fileData = await downloadTelegramFile(message.voice.file_id, botToken);
        fileData.filename = `voice_${message.message_id}.ogg`;
        fileData.mimeType = message.voice.mime_type || 'audio/ogg';
        
        const document = await processDocument(db, integration, fileData, {
          ...metadata,
          type: 'voice',
          duration: message.voice.duration
        });
        documentsProcessed.push(document);
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
              source: 'telegram',
              integrationId: integration.id,
              documentsCount: documentsProcessed.length,
              chatId: message.chat.id,
              messageId: message.message_id
            }
          }
        });
      }
      
      return NextResponse.json({ 
        ok: true, 
        processed: documentsProcessed.length,
        documents: documentsProcessed.map(d => ({
          id: d.id,
          filename: d.filename,
          type: d.fileType
        }))
      });
      
    } catch (error) {
      console.error('Error processing Telegram webhook:', error);
      
      // Log error
      await db.prisma.auditLog.create({
        data: {
          userId: integration.userId,
          action: 'INTEGRATION_ERROR',
          resource: 'INTEGRATION',
          resourceId: integration.id,
          details: {
            source: 'telegram',
            error: error.message,
            chatId: message.chat.id,
            messageId: message.message_id
          }
        }
      });
      
      return NextResponse.json({ 
        ok: false, 
        error: 'Processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}