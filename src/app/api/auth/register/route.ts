import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { RegisterData, AuthUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const data: RegisterData = await request.json();
    
    // Validate required fields
    if (!data.email || !data.password || !data.name || !data.userType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: email, password, name, userType' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (data.password.length < 6) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        },
        { status: 400 }
      );
    }

    // Note: profession is optional, so we don't validate it as required

    const db = getDatabase();
    

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

    // Register the user
    const user = await db.registerUser(data);

    // Generate authentication token
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      avatar: user.avatar || undefined,
      userType: user.userType,
      profession: user.profession || undefined,
      currentOrganization: undefined // New users don't have organizations initially
    };

    const token = db.generateJWT(authUser);

    // Remove password from response
    const { password, ...userResponse } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: userResponse,
        message: 'User registered successfully'
      },
      token, // Add the token to the response
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message === 'User already exists with this email') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'An account with this email already exists' 
        },
        { status: 409 }
      );
    }

    console.error('Error details:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}