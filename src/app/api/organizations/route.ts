import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedHandler, createAuthenticatedAPIHandler } from '@/lib/auth';
import { OrganizationType } from '@prisma/client';

// Get user's organizations
export const GET = createAuthenticatedHandler(async (request: NextRequest, user, authUser) => {
  try {
    const db = getDatabase();
    
    const memberships = await db.prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                documents: true,
                folders: true
              }
            }
          }
        }
      }
    });

    const formattedOrganizations = memberships.map(membership => ({
      ...membership.organization,
      membershipRole: membership.role,
      membershipJoinedAt: membership.joinedAt,
      documentCount: membership.organization._count.documents,
      folderCount: membership.organization._count.folders
    }));

    return NextResponse.json({
      success: true,
      data: formattedOrganizations,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Organizations API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch organizations',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// Create new organization
export const POST = createAuthenticatedHandler(async (request: NextRequest, user, authUser) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.slug || !data.type) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, slug, type' 
        },
        { status: 400 }
      );
    }

    // Validate organization type
    const validTypes = Object.values(OrganizationType);
    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid organization type',
          validTypes
        },
        { status: 400 }
      );
    }

    // Validate slug format (alphanumeric and hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(data.slug)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Slug must contain only lowercase letters, numbers, and hyphens' 
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Check if slug is already taken
    const existingOrg = await db.prisma.organization.findUnique({
      where: { slug: data.slug }
    });

    if (existingOrg) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Organization slug already exists. Please choose a different one.' 
        },
        { status: 409 }
      );
    }

    const organization = await db.createOrganization({
      name: data.name,
      slug: data.slug,
      description: data.description,
      type: data.type,
      ownerId: user.id
    });

    return NextResponse.json({
      success: true,
      data: organization,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create organization',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});