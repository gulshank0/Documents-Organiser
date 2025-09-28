import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { cloudinaryService } from '@/lib/cloudinary';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    console.log('Uploading avatar for user:', user.id, 'File:', file.name);

    // Delete old avatar from Cloudinary if exists
    if (user.avatarPublicId) {
      try {
        await cloudinaryService.deleteFile(user.avatarPublicId, 'image');
        console.log('Deleted old avatar:', user.avatarPublicId);
      } catch (deleteError) {
        console.warn('Failed to delete old avatar:', deleteError);
        // Don't fail the upload if old avatar deletion fails
      }
    }

    // Upload new avatar to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());
    const cloudinaryResult = await cloudinaryService.uploadAvatar(
      buffer,
      user.id,
      file.name
    );

    console.log('Avatar uploaded to Cloudinary:', cloudinaryResult.public_id);

    // Update user avatar in database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatar: cloudinaryResult.secure_url,
        avatarPublicId: cloudinaryResult.public_id,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: updatedUser.avatar,
        avatarPublicId: updatedUser.avatarPublicId,
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload avatar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}