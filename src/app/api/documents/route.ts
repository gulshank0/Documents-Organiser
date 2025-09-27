import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { serializeBigInt } from '@/lib/utils';

// Remove the duplicate PrismaClient instance
// const prisma = new PrismaClient();

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export const GET = async (request: NextRequest) => {
  try {
    // Use NextAuth for authentication (same as upload API)
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No authentication session found' 
        },
        { status: 401 }
      );
    }

    // Use the singleton database instance
    const db = getDatabase();

    // Get user from database using email from session  
    const user = await db.client.user.findUnique({
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

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const department = searchParams.get('department') || undefined;
    const status = searchParams.get('status') || undefined;
    const folderId = searchParams.get('folderId') || undefined;
    const visibility = searchParams.get('visibility')?.split(',') as any[] || undefined;

    console.log('Fetching documents for user:', user.email, user.id);
    
    // Get current organization context
    const organizationId = user.organizations?.[0]?.organizationId || null;

    // Test database connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      console.error('Database connection failed');
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection failed' 
        },
        { status: 500 }
      );
    }

    const documents = await db.getDocuments({ 
      userId: user.id,
      organizationId: organizationId || undefined,
      skip, 
      limit, 
      department, 
      status,
      folderId,
      visibility
    });
    
    console.log('Documents found:', documents.length);
    
    // Serialize BigInt values before returning
    const serializedDocuments = serializeBigInt(documents);
    
    return NextResponse.json({
      success: true,
      data: serializedDocuments,
      pagination: {
        page: Math.floor(skip / limit) + 1,
        limit,
        total: documents.length, // This should be the actual total count
        hasNext: documents.length === limit,
        hasPrev: skip > 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch documents', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    // Use NextAuth for authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No authentication session found' 
        },
        { status: 401 }
      );
    }

    // Use the singleton database instance
    const db = getDatabase();

    // Get user from database using email from session
    const user = await db.client.user.findUnique({
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

    const data = await request.json();
    
    // Validate required fields
    if (!data.filename || !data.originalPath || !data.fileType || !data.mimeType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: filename, originalPath, fileType, mimeType' 
        },
        { status: 400 }
      );
    }

    const organizationId = user.organizations?.[0]?.organizationId || null;

    const document = await db.createDocument({
      filename: data.filename,
      originalPath: data.originalPath,
      fileType: data.fileType,
      mimeType: data.mimeType,
      fileSize: data.fileSize ? BigInt(data.fileSize) : undefined,
      channel: data.channel || 'WEB_UPLOAD',
      department: data.department,
      userId: user.id,
      organizationId: organizationId || undefined,
      folderId: data.folderId,
      tags: data.tags,
      visibility: data.visibility || 'PRIVATE',
      metaData: data.metaData
    });

    return NextResponse.json({
      success: true,
      data: document,
      message: 'Document created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create document', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};