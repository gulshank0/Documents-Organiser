import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedAPIHandler } from '@/lib/auth'

export const GET = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    // Update last login time
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    
    // Get fresh user data with all relations
    const freshUser = await db.getUserById(user.id);
    
    if (!freshUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: freshUser.id,
        email: freshUser.email,
        name: freshUser.name,
        avatar: freshUser.avatar,
        userType: freshUser.userType,
        profession: freshUser.profession,
        bio: freshUser.bio,
        timezone: freshUser.timezone,
        isActive: freshUser.isActive,
        lastLoginAt: freshUser.lastLoginAt,
        createdAt: freshUser.createdAt,
        preferences: freshUser.preferences,
        organizations: freshUser.organizations?.map(org => ({
          id: org.id,
          role: org.role,
          permissions: org.permissions,
          organizationId: org.organizationId
        })) || [],
        stats: {
          documentsCount: 0, // This would need to be calculated
          foldersCount: 0    // This would need to be calculated
        }
      }
    })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
})

export const PUT = createAuthenticatedAPIHandler(async (
  request: NextRequest, 
  user: any, 
  authUser: any
) => {
  try {
    const { getDatabase } = await import('@/lib/database');
    const db = getDatabase();
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validate userType if provided
    if (data.userType && !['INDIVIDUAL', 'ORGANIZATION'].includes(data.userType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user type' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      name: data.name.trim(),
      updatedAt: new Date()
    };

    // Add optional fields if provided
    if (data.profession !== undefined) {
      updateData.profession = data.profession ? data.profession.trim() : null;
    }

    if (data.userType) {
      updateData.userType = data.userType;
    }

    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }

    // Update user in database
    const updatedUser = await db.client.user.update({
      where: { id: user.id },
      data: updateData,
      include: {
        preferences: true,
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        userType: updatedUser.userType,
        profession: updatedUser.profession,
        bio: updatedUser.bio,
        timezone: updatedUser.timezone,
        isActive: updatedUser.isActive,
        lastLoginAt: updatedUser.lastLoginAt,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        preferences: updatedUser.preferences,
        organizations: updatedUser.organizations?.map(org => ({
          id: org.id,
          role: org.role,
          permissions: org.permissions,
          organizationId: org.organizationId
        })) || []
      }
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
})