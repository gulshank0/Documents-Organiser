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