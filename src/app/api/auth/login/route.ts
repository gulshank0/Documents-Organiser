import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { LoginCredentials } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const credentials: LoginCredentials = await request.json();
    
    // Validate required fields
    if (!credentials.email || !credentials.password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email and password are required' 
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Check if database is connected
    const isConnected = await db.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed' 
        },
        { status: 500 }
      );
    }

    const result = await db.loginUser(credentials);

    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email or password' 
        },
        { status: 401 }
      );
    }

    const { user, token } = result;

    // Remove password from response
    const { password, ...userResponse } = user;

    // Set HTTP-only cookie for the token
    const response = NextResponse.json({
      success: true,
      data: {
        user: userResponse,
        token,
        message: 'Login successful'
      },
      timestamp: new Date().toISOString()
    });

    // Set secure cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}