import { NextRequest } from 'next/server'
import { createAuthenticatedAPIHandler } from '@/lib/auth'
import { getDatabase } from '@/lib/database'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  profession: z.string().max(100).optional(),
  timezone: z.string().optional(),
})

export const GET = createAuthenticatedAPIHandler(async (request, user, authUser) => {
  try {
    const db = getDatabase()
    
    const userData = await db.client.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        profession: true,
        timezone: true,
        userType: true,
        createdAt: true,
        lastLoginAt: true,
        preferences: {
          select: {
            theme: true,
            language: true,
            timezone: true,
            emailNotifications: true,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: true,
            aiSuggestions: true,
          }
        }
      }
    })

    if (!userData) {
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return Response.json({
      success: true,
      data: userData,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return Response.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
})

export const PATCH = createAuthenticatedAPIHandler(async (request, user, authUser) => {
  try {
    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)
    
    const db = getDatabase()
    
    const updatedUser = await db.client.user.update({
      where: { id: user.id },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        profession: true,
        timezone: true,
        updatedAt: true,
      }
    })

    return Response.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error updating profile:', error)
    
    if (error.name === 'ZodError') {
      return Response.json(
        { 
          success: false, 
          error: 'Validation error',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return Response.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    )
  }
})