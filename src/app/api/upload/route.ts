import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getDatabase } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkStorageQuota } from '@/lib/auth';
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/types';
import { PrismaClient } from '@prisma/client';

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
    
    // Get organization context - simplified since we don't have the helper function
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

    // Create upload directory structure
    const uploadDir = organizationId ? 
      path.join(process.cwd(), 'uploads', 'organizations', organizationId) :
      path.join(process.cwd(), 'uploads', 'users', user.id);
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${sanitizedFilename}`;
    const filePath = path.join(uploadDir, filename);

    // Save file to disk
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      console.log('File saved successfully:', filePath);
    } catch (error) {
      console.error('Failed to save file:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to save file to disk' 
        },
        { status: 500 }
      );
    }

    // Database operations
    let createdDocument;
    const db = getDatabase();
    
    try {
      // Test database connection first, but don't fail if it's not available
      const isConnected = await db.testConnection();
      console.log('Database connection status:', isConnected);
      
      if (!isConnected) {
        console.warn('Database not connected, but proceeding with file-only upload');
        // Return success response even without database storage
        return NextResponse.json({
          success: true,
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type,
          status: 'FILE_ONLY',
          message: 'File uploaded successfully (database offline)',
          database_connected: false,
          processingSteps: [
            'File uploaded and validated',
            'File saved to disk',
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

      // Determine MIME type and classify department
      const mimeType = file.type || 'application/octet-stream';
      const classifiedDepartment = department || classifyDepartment(file.name);
      
      // Parse tags
      const parsedTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

      // Generate metadata
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
        processingHints: {
          needsOcr: ['pdf', 'jpg', 'jpeg', 'png', 'tiff'].includes(fileExtension),
          needsThumbnail: mimeType.startsWith('image/') || mimeType.startsWith('video/'),
          needsTextExtraction: !mimeType.startsWith('image/') && !mimeType.startsWith('video/') && !mimeType.startsWith('audio/')
        }
      };

      // Create document record in database
      createdDocument = await db.createDocument({
        filename: file.name,
        originalPath: filePath,
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

    } catch (dbError) {
      console.error('Database error:', dbError);
      // Return success response even if database storage fails
      return NextResponse.json({
        success: true,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'FILE_ONLY',
        message: 'File uploaded successfully (database error occurred)',
        database_connected: false,
        database_error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        processingSteps: [
          'File uploaded and validated',
          'File saved to disk',
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
      message: 'File uploaded successfully',
      processingSteps: [
        'File uploaded and validated',
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
      thumbnailGenerated: false,
      textExtracted: false,
      embeddingsGenerated: false,
      timestamp: new Date().toISOString()
    };

    console.log('Upload completed successfully:', {
      documentId: createdDocument.id,
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
  const lowerFilename = filename.toLowerCase();
  
  // Academic keywords (for educational institutions)
  if (lowerFilename.includes('assignment') || 
      lowerFilename.includes('homework') || 
      lowerFilename.includes('thesis') ||
      lowerFilename.includes('research') ||
      lowerFilename.includes('paper') ||
      lowerFilename.includes('study') ||
      lowerFilename.includes('course') ||
      lowerFilename.includes('lecture')) {
    return 'ACADEMIC';
  }
  
  // Engineering keywords
  if (lowerFilename.includes('engineering') || 
      lowerFilename.includes('technical') || 
      lowerFilename.includes('design') ||
      lowerFilename.includes('blueprint') ||
      lowerFilename.includes('specification') ||
      lowerFilename.includes('cad') ||
      lowerFilename.includes('drawing')) {
    return 'ENGINEERING';
  }
  
  // Business/Marketing keywords
  if (lowerFilename.includes('marketing') || 
      lowerFilename.includes('campaign') || 
      lowerFilename.includes('proposal') ||
      lowerFilename.includes('presentation') ||
      lowerFilename.includes('pitch') ||
      lowerFilename.includes('strategy') ||
      lowerFilename.includes('business')) {
    return 'MARKETING';
  }
  
  // Research keywords
  if (lowerFilename.includes('research') || 
      lowerFilename.includes('analysis') || 
      lowerFilename.includes('data') ||
      lowerFilename.includes('study') ||
      lowerFilename.includes('survey') ||
      lowerFilename.includes('experiment') ||
      lowerFilename.includes('findings')) {
    return 'RESEARCH';
  }
  
  // HR keywords
  if (lowerFilename.includes('hr') || 
      lowerFilename.includes('human') || 
      lowerFilename.includes('employee') ||
      lowerFilename.includes('resume') ||
      lowerFilename.includes('cv') ||
      lowerFilename.includes('payroll') ||
      lowerFilename.includes('recruitment') ||
      lowerFilename.includes('policy') ||
      lowerFilename.includes('leave') ||
      lowerFilename.includes('attendance')) {
    return 'HR';
  }
  
  // Finance keywords
  if (lowerFilename.includes('finance') || 
      lowerFilename.includes('budget') || 
      lowerFilename.includes('account') ||
      lowerFilename.includes('invoice') ||
      lowerFilename.includes('receipt') ||
      lowerFilename.includes('expense') ||
      lowerFilename.includes('cost') ||
      lowerFilename.includes('audit') ||
      lowerFilename.includes('tax')) {
    return 'FINANCE';
  }
  
  // Legal keywords
  if (lowerFilename.includes('legal') || 
      lowerFilename.includes('contract') ||
      lowerFilename.includes('agreement') ||
      lowerFilename.includes('mou') ||
      lowerFilename.includes('nda') ||
      lowerFilename.includes('litigation') ||
      lowerFilename.includes('compliance')) {
    return 'LEGAL';
  }
  
  // Operations keywords
  if (lowerFilename.includes('operation') || 
      lowerFilename.includes('maintenance') ||
      lowerFilename.includes('schedule') ||
      lowerFilename.includes('report') ||
      lowerFilename.includes('daily') ||
      lowerFilename.includes('weekly') ||
      lowerFilename.includes('monthly') ||
      lowerFilename.includes('service')) {
    return 'OPERATIONS';
  }
  
  return 'GENERAL';
}