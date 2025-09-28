import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { authenticateRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params in Next.js 15+
    const params = await context.params;
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user || !auth.authUser) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const folderId = params.id;
    const db = getDatabase();

    const folder = await db.client.folder.findFirst({
      where: {
        id: folderId,
        OR: [
          { userId: user.id },
          {
            visibility: 'ORGANIZATION',
            organization: {
              members: {
                some: { userId: user.id }
              }
            }
          },
          { visibility: 'SHARED' }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        documents: {
          select: { id: true, filename: true, fileType: true }
        },
        children: true
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: folder,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching folder:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch folder',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params in Next.js 15+
    const params = await context.params;
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user || !auth.authUser) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const folderId = params.id;
    const data = await request.json();
    const db = getDatabase();

    // Check if user can edit this folder
    const folder = await db.client.folder.findFirst({
      where: {
        id: folderId,
        OR: [
          { userId: user.id },
          {
            visibility: 'ORGANIZATION',
            organization: {
              members: {
                some: { 
                  userId: user.id,
                  role: { in: ['ADMIN', 'OWNER', 'MANAGER'] }
                }
              }
            }
          }
        ]
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Update folder
    const updatedFolder = await db.client.folder.update({
      where: { id: folderId },
      data: {
        name: data.name || folder.name,
        description: data.description !== undefined ? data.description : folder.description,
        color: data.color || folder.color,
        visibility: data.visibility || folder.visibility
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedFolder,
      message: 'Folder updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error updating folder:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update folder',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params in Next.js 15+
    const params = await context.params;
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success || !auth.user || !auth.authUser) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = auth;
    const folderId = params.id;
    const db = getDatabase();

    // Check if user can delete this folder
    const folder = await db.client.folder.findFirst({
      where: {
        id: folderId,
        OR: [
          { userId: user.id },
          {
            visibility: 'ORGANIZATION',
            organization: {
              members: {
                some: { 
                  userId: user.id,
                  role: { in: ['ADMIN', 'OWNER'] }
                }
              }
            }
          }
        ]
      },
      include: {
        documents: true,
        children: true
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Move documents to root (no folder) and child folders to root level
    await db.client.$transaction(async (tx) => {
      // Move documents to no folder
      if (folder.documents.length > 0) {
        await tx.document.updateMany({
          where: { folderId },
          data: { folderId: null }
        });
      }

      // Move child folders to root level
      if (folder.children.length > 0) {
        await tx.folder.updateMany({
          where: { parentId: folderId },
          data: { parentId: null }
        });
      }

      // Delete the folder
      await tx.folder.delete({
        where: { id: folderId }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully. Documents and subfolders moved to root level.',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete folder',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}