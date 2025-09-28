import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedHandler, getCurrentOrganization } from '@/lib/auth';

export const GET = createAuthenticatedHandler(async (request: NextRequest, user, authUser) => {
  try {
    const db = getDatabase();
    const organizationId = getCurrentOrganization(user, request);

    const folders = await db.getFolders(user.id, organizationId || undefined);

    // Transform folders into tree structure
    const folderTree = buildFolderTree(folders);

    return NextResponse.json({
      success: true,
      data: folderTree,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Folders API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch folders',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

export const POST = createAuthenticatedHandler(async (request: NextRequest, user, authUser) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Folder name is required' 
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const organizationId = getCurrentOrganization(user, request);

    const folder = await db.createFolder({
      name: data.name,
      description: data.description,
      userId: user.id,
      organizationId: organizationId || undefined,
      parentId: data.parentId,
      visibility: data.visibility || 'PRIVATE',
      color: data.color
    });

    return NextResponse.json({
      success: true,
      data: folder,
      message: 'Folder created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create folder',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// Helper function to build folder tree structure
function buildFolderTree(folders: any[]): any[] {
  const folderMap = new Map();
  const rootFolders: any[] = [];

  // Create a map of all folders
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      documentCount: folder.documents?.length || 0
    });
  });

  // Build the tree structure
  folders.forEach(folder => {
    const folderNode = folderMap.get(folder.id);
    
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent) {
        parent.children.push(folderNode);
      } else {
        // Parent not accessible, treat as root
        rootFolders.push(folderNode);
      }
    } else {
      rootFolders.push(folderNode);
    }
  });

  return rootFolders;
}