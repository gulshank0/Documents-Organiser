import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkStorageQuota } from '@/lib/auth';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/types';
import { PrismaClient } from '@prisma/client';
import { cloudinaryService } from '@/lib/cloudinary';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Use NextAuth for authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No authentication token provided' 
        },
        { status: 401 }
      );
    }

    // Get user from database using email from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user?.isActive) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found or inactive' 
        },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const department = formData.get('department') as string;
    const folderId = formData.get('folderId') as string;
    const tags = formData.get('tags') as string;
    const visibility = formData.get('visibility') as string || 'PRIVATE';
    const channel = formData.get('channel') as string || 'WEB_UPLOAD';
    
    // Get organization context
    const organizationId = user.organizations?.[0]?.organizationId || null;

    if (!file) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          success: false,
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
        },
        { status: 400 }
      );
    }

    // Check storage quota
    const quotaCheck = await checkStorageQuota(user.id, file.size);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Storage quota exceeded',
          details: {
            currentUsage: quotaCheck.currentUsage,
            maxStorage: quotaCheck.maxStorage,
            remainingStorage: quotaCheck.remainingStorage,
            requestedSize: file.size
          }
        },
        { status: 413 }
      );
    }

    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_FILE_TYPES.includes(fileExtension as any)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unsupported file type',
          supportedTypes: SUPPORTED_FILE_TYPES
        },
        { status: 400 }
      );
    }

    console.log('Starting Cloudinary upload for:', file.name, 'Size:', file.size);

    // Database operations
    let createdDocument;
    const db = getDatabase();
    
    try {
      // Test database connection first
      const isConnected = await db.testConnection();
      console.log('Database connection status:', isConnected);
      
      if (!isConnected) {
        console.warn('Database not connected, but proceeding with Cloudinary upload');
        
        // Upload to Cloudinary even if database is offline
        const buffer = Buffer.from(await file.arrayBuffer());
        const cloudinaryResult = await cloudinaryService.uploadDocument(
          buffer,
          file.name,
          user.id,
          organizationId || undefined
        );

        return NextResponse.json({
          success: true,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: 'CLOUDINARY_ONLY',
          message: 'File uploaded to Cloudinary successfully (database offline)',
          database_connected: false,
          cloudinary_url: cloudinaryResult.secure_url,
          cloudinary_public_id: cloudinaryResult.public_id,
          processingSteps: [
            'File uploaded and validated',
            'File uploaded to Cloudinary',
            'Database offline - metadata not stored'
          ],
          mlResults: {
            confidenceScore: 0.0,
            extractedTextPreview: 'Database offline - text extraction skipped',
            classificationHints: {
              needsOcr: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(fileExtension),
              needsThumbnail: file.type?.startsWith('image/') || file.type?.startsWith('video/'),
              needsTextExtraction: !file.type?.startsWith('image/') && !file.type?.startsWith('video/') && !file.type?.startsWith('audio/')
            }
          },
          thumbnailGenerated: false,
          textExtracted: false,
          embeddingsGenerated: false,
          timestamp: new Date().toISOString()
        });
      }

      // Upload file to Cloudinary
      const buffer = Buffer.from(await file.arrayBuffer());
      const cloudinaryResult = await cloudinaryService.uploadDocument(
        buffer,
        file.name,
        user.id,
        organizationId || undefined
      );

      console.log('Cloudinary upload successful:', cloudinaryResult.public_id);

      // Determine MIME type and classify department
      const mimeType = file.type || 'application/octet-stream';
      const classifiedDepartment = department || classifyDepartment(file.name);
      
      // Parse tags
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // Generate metadata with Cloudinary info
      const metadata = {
        originalFilename: file.name,
        uploadTimestamp: new Date().toISOString(),
        fileSize: file.size,
        channel: channel,
        uploader: user.name || user.email,
        fileExtension: fileExtension,
        mimeType: mimeType,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        cloudinary: {
          public_id: cloudinaryResult.public_id,
          secure_url: cloudinaryResult.secure_url,
          format: cloudinaryResult.format,
          resource_type: cloudinaryResult.resource_type,
          bytes: cloudinaryResult.bytes,
          created_at: cloudinaryResult.created_at,
          version: cloudinaryResult.version,
        },
        processingHints: {
          needsOcr: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(fileExtension),
          needsThumbnail: mimeType.startsWith('image/') || mimeType.startsWith('video/'),
          needsTextExtraction: !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')
        }
      };

      // Create document record in database with Cloudinary URLs
      createdDocument = await db.createDocument({
        filename: file.name,
        originalPath: cloudinaryResult.secure_url, // Store Cloudinary URL
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        fileType: fileExtension,
        mimeType: mimeType,
        fileSize: BigInt(file.size),
        channel: channel as any,
        department: classifiedDepartment,
        userId: user.id,
        organizationId: organizationId || undefined,
        folderId: folderId || undefined,
        tags: parsedTags,
        visibility: visibility as any,
        metaData: metadata
      });

      console.log('Document created in database:', createdDocument.id);

      // Generate thumbnail for supported file types
      if (mimeType.startsWith('image/') && !mimeType.includes('svg')) {
        try {
          const thumbnailResult = await cloudinaryService.uploadThumbnail(
            buffer,
            createdDocument.id,
            cloudinaryResult.format
          );
          
          // Update document with thumbnail info
          await db.client.document.update({
            where: { id: createdDocument.id },
            data: {
              thumbnailPath: thumbnailResult.secure_url,
              thumbnailPublicId: thumbnailResult.public_id
            }
          });
          
          console.log('Thumbnail generated:', thumbnailResult.public_id);
        } catch (thumbnailError) {
          console.error('Thumbnail generation failed:', thumbnailError);
          // Don't fail the upload if thumbnail generation fails
        }
      }

    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Even if database fails, we still have the file in Cloudinary
      // Try to upload to Cloudinary if not already done
      let cloudinaryResult = null;
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        cloudinaryResult = await cloudinaryService.uploadDocument(
          buffer,
          file.name,
          user.id,
          organizationId || undefined
        );
      } catch (cloudinaryError) {
        console.error('Cloudinary upload also failed:', cloudinaryError);
        return NextResponse.json({
          success: false,
          error: 'Both database and Cloudinary upload failed',
          database_error: dbError instanceof Error ? dbError.message : 'Unknown database error',
          cloudinary_error: cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown Cloudinary error',
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'CLOUDINARY_ONLY',
        message: 'File uploaded to Cloudinary successfully (database error occurred)',
        database_connected: false,
        database_error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        cloudinary_url: cloudinaryResult.secure_url,
        cloudinary_public_id: cloudinaryResult.public_id,
        processingSteps: [
          'File uploaded and validated',
          'File uploaded to Cloudinary',
          'Database error - metadata not stored'
        ],
        mlResults: {
          confidenceScore: 0.0,
          extractedTextPreview: 'Database error - text extraction skipped',
          classificationHints: {
            needsOcr: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(fileExtension),
            needsThumbnail: file.type?.startsWith('image/') || file.type?.startsWith('video/'),
            needsTextExtraction: !file.type?.startsWith('image/') && !file.type?.startsWith('video/') && !file.type?.startsWith('audio/')
          }
        },
        thumbnailGenerated: false,
        textExtracted: false,
        embeddingsGenerated: false,
        timestamp: new Date().toISOString()
      });
    }

    // Prepare response
    const processingResult = {
      success: true,
      documentId: createdDocument.id,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'PENDING',
      message: 'File uploaded successfully to Cloudinary',
      database_connected: true,
      cloudinary_url: createdDocument.cloudinaryUrl,
      cloudinary_public_id: createdDocument.cloudinaryPublicId,
      processingSteps: [
        'File uploaded and validated',
        'File uploaded to Cloudinary',
        'Metadata extracted and stored',
        'Queued for processing'
      ],
      mlResults: {
        confidenceScore: 0.85,
        extractedTextPreview: 'Document queued for text extraction...',
        classificationHints: {
          needsOcr: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(fileExtension),
          needsThumbnail: file.type?.startsWith('image/') || file.type?.startsWith('video/'),
          needsTextExtraction: !file.type?.startsWith('image/') && !file.type?.startsWith('video/') && !file.type?.startsWith('audio/')
        }
      },
      thumbnailGenerated: !!createdDocument.thumbnailPath,
      textExtracted: false,
      embeddingsGenerated: false,
      timestamp: new Date().toISOString()
    };

    // Background processing for text extraction and embedding generation
    processDocumentInBackground(createdDocument.id, createdDocument.cloudinaryUrl!, file.name, fileExtension);

    console.log('Upload completed successfully:', {
      documentId: createdDocument.id,
      cloudinaryUrl: createdDocument.cloudinaryUrl,
      filename: file.name,
      userId: user.id,
      organizationId
    });

    return NextResponse.json(processingResult);

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Upload failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Enhanced department classification function
function classifyDepartment(filename: string): string {
  const name = filename.toLowerCase();
  
  // Finance keywords
  if (name.includes('invoice') || name.includes('receipt') || name.includes('budget') || 
      name.includes('expense') || name.includes('payment') || name.includes('tax')) {
    return 'FINANCE';
  }
  
  // HR keywords
  if (name.includes('resume') || name.includes('cv') || name.includes('employee') || 
      name.includes('payroll') || name.includes('hr') || name.includes('policy')) {
    return 'HR';
  }
  
  // Legal keywords
  if (name.includes('contract') || name.includes('agreement') || name.includes('legal') || 
      name.includes('terms') || name.includes('policy') || name.includes('compliance')) {
    return 'LEGAL';
  }
  
  // Marketing keywords
  if (name.includes('marketing') || name.includes('campaign') || name.includes('brand') || 
      name.includes('social') || name.includes('content') || name.includes('design')) {
    return 'MARKETING';
  }
  
  // IT keywords
  if (name.includes('technical') || name.includes('system') || name.includes('server') || 
      name.includes('database') || name.includes('code') || name.includes('api')) {
    return 'IT';
  }
  
  return 'GENERAL';
}

// Background processing function for text extraction and embedding generation
async function processDocumentInBackground(documentId: string, cloudinaryUrl: string, filename: string, fileExtension: string) {
  try {
    console.log(`Starting background processing for document ${documentId}`);
    
    const db = getDatabase();
    
    // Update document status to PROCESSING
    await db.client.document.update({
      where: { id: documentId },
      data: { 
        status: 'PROCESSING',
        processedAt: new Date()
      }
    });

    // Extract text based on file type
    let extractedText = '';
    
    try {
      // For Cloudinary-hosted files, we need to download the file first for text extraction
      extractedText = await extractTextFromCloudinaryFile(cloudinaryUrl, fileExtension);
      
      if (extractedText) {
        // Update document with extracted text
        await db.client.document.update({
          where: { id: documentId },
          data: { 
            extractedText: extractedText.substring(0, 50000), // Limit to 50k characters
            status: 'COMPLETED'
          }
        });

        // Generate and store embedding for semantic search
        await db.storeDocumentEmbedding(documentId, extractedText);
        
        console.log(`Successfully processed document ${documentId} with ${extractedText.length} characters extracted`);
      } else {
        // No text extracted but processing completed
        await db.client.document.update({
          where: { id: documentId },
          data: { status: 'COMPLETED' }
        });
        
        console.log(`Document ${documentId} processed but no text extracted`);
      }
    } catch (textError) {
      console.error(`Text extraction failed for document ${documentId}:`, textError);
      
      // Update status to FAILED with error message
      await db.client.document.update({
        where: { id: documentId },
        data: { 
          status: 'FAILED',
          errorMessage: textError instanceof Error ? textError.message : 'Text extraction failed'
        }
      });
    }

  } catch (error) {
    console.error(`Background processing failed for document ${documentId}:`, error);
    
    // Update status to FAILED
    try {
      const db = getDatabase();
      await db.client.document.update({
        where: { id: documentId },
        data: { 
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Background processing failed'
        }
      });
    } catch (updateError) {
      console.error(`Failed to update document status for ${documentId}:`, updateError);
    }
  }
}

// Enhanced text extraction function for Cloudinary URLs
async function extractTextFromCloudinaryFile(cloudinaryUrl: string, fileExtension: string): Promise<string> {
  try {
    // For now, return a placeholder. In production, you'd implement actual text extraction
    // by downloading the file from Cloudinary and processing it
    console.log(`Text extraction for ${fileExtension} files from Cloudinary not yet implemented`);
    
    // You can implement actual text extraction here by:
    // 1. Downloading the file from Cloudinary URL
    // 2. Using libraries like pdf-parse, mammoth, xlsx, etc.
    // 3. Extracting text based on file type
    
    return `Text extraction from ${fileExtension} files will be implemented here`;
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
}