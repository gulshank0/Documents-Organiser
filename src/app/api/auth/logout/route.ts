import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // In NextAuth, logout is handled on the client side
    // This endpoint can be used for additional cleanup if needed
    return NextResponse.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}