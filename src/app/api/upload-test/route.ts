import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  console.log('=== UPLOAD TEST API CALLED ===');
  
  try {
    // Step 1: Test basic request handling
    console.log('Step 1: Basic request handling - OK');
    
    // Step 2: Test authentication
    console.log('Step 2: Testing authentication...');
    let session;
    try {
      session = await getServerSession(authOptions);
      console.log('Step 2: Authentication result:', session ? 'SUCCESS' : 'NO_SESSION');
      
      if (session?.user?.email) {
        console.log('Step 2: User email:', session.user.email);
      }
    } catch (authError) {
      console.error('Step 2: Authentication failed:', authError);
      return NextResponse.json({
        success: false,
        error: 'Authentication test failed',
        step: 2,
        details: authError instanceof Error ? authError.message : 'Unknown auth error'
      }, { status: 500 });
    }
    
    // Step 3: Test form data parsing
    console.log('Step 3: Testing form data parsing...');
    let formData;
    try {
      formData = await request.formData();
      console.log('Step 3: Form data parsed successfully');
      
      const file = formData.get('file') as File;
      if (file) {
        console.log('Step 3: File found -', {
          name: file.name,
          size: file.size,
          type: file.type
        });
      } else {
        console.log('Step 3: No file in form data');
      }
    } catch (parseError) {
      console.error('Step 3: Form data parsing failed:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Form data parsing test failed',
        step: 3,
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 500 });
    }
    
    // Step 4: Test environment variables
    console.log('Step 4: Testing environment variables...');
    const envCheck = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    };
    console.log('Step 4: Environment variables:', envCheck);
    
    // Step 5: Test imports
    console.log('Step 5: Testing imports...');
    try {
      const { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } = await import('@/types');
      console.log('Step 5: Types imported successfully');
      console.log('Step 5: SUPPORTED_FILE_TYPES length:', SUPPORTED_FILE_TYPES.length);
      console.log('Step 5: MAX_FILE_SIZE:', MAX_FILE_SIZE);
      console.log('Step 5: PDF supported:', SUPPORTED_FILE_TYPES.includes('pdf'));
    } catch (importError) {
      console.error('Step 5: Import failed:', importError);
      return NextResponse.json({
        success: false,
        error: 'Import test failed',
        step: 5,
        details: importError instanceof Error ? importError.message : 'Unknown import error'
      }, { status: 500 });
    }
    
    // Step 6: Test database connection
    console.log('Step 6: Testing database connection...');
    try {
      const { getDatabase } = await import('@/lib/database');
      const db = getDatabase();
      const isConnected = await db.testConnection();
      console.log('Step 6: Database connection:', isConnected ? 'SUCCESS' : 'FAILED');
    } catch (dbError) {
      console.error('Step 6: Database test failed:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database test failed',
        step: 6,
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 });
    }
    
    // Success response
    return NextResponse.json({
      success: true,
      message: 'All tests passed successfully',
      session: session ? {
        hasUser: !!session.user,
        email: session.user?.email || null
      } : null,
      environment: envCheck,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('=== UPLOAD TEST FAILED ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    return NextResponse.json({
      success: false,
      error: 'Test endpoint failed',
      details: error.message || 'Unknown error',
      errorType: error.constructor.name || 'UnknownError',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Upload test endpoint - use POST with file data to test upload functionality',
    timestamp: new Date().toISOString()
  });
}