#!/usr/bin/env tsx

/**
 * Simple Cloudinary connection test
 * Run with: npx tsx cloudinary-test.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import { readFileSync } from 'fs';
import { join } from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function testCloudinary() {
  console.log('=== Cloudinary Connection Test ===\n');

  // Step 1: Check environment variables
  console.log('1. Environment Variables:');
  console.log('   CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing');
  console.log('   CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('   CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing');
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.\n');
    return;
  }

  // Step 2: Test API connection
  console.log('\n2. Testing API Connection:');
  try {
    const pingResult = await cloudinary.api.ping();
    console.log('   API Ping:', pingResult.status === 'ok' ? '✓ Success' : '✗ Failed');
    console.log('   Response:', pingResult);
  } catch (apiError) {
    console.log('   API Ping: ✗ Failed');
    console.log('   Error:', apiError);
    return;
  }

  // Step 3: Test simple upload with buffer
  console.log('\n3. Testing Buffer Upload:');
  try {
    // Create a simple test buffer (1x1 pixel PNG)
    const testBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x35, 0x6C, 0xFB, 0xDA, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);

    console.log('   Creating test buffer... ✓');
    console.log('   Buffer size:', testBuffer.length, 'bytes');

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'test',
          public_id: `test_${Date.now()}`,
        },
        (error, result) => {
          if (error) {
            console.log('   Upload Stream Error Details:');
            console.log('     Message:', error.message);
            console.log('     HTTP Code:', error.http_code);
            console.log('     Error Object:', error.error);
            console.log('     Full Error:', JSON.stringify(error, null, 2));
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      uploadStream.end(testBuffer);
    });

    console.log('   Buffer Upload: ✓ Success');
    console.log('   Result:', {
      public_id: (uploadResult as any).public_id,
      secure_url: (uploadResult as any).secure_url,
      format: (uploadResult as any).format,
      bytes: (uploadResult as any).bytes
    });

    // Clean up test file
    try {
      await cloudinary.uploader.destroy((uploadResult as any).public_id);
      console.log('   Cleanup: ✓ Test file deleted');
    } catch (cleanupError) {
      console.log('   Cleanup: ⚠ Could not delete test file');
    }

  } catch (uploadError) {
    console.log('   Buffer Upload: ✗ Failed');
    console.log('   Error Details:');
    console.log('     Message:', uploadError instanceof Error ? uploadError.message : 'Unknown');
    console.log('     Type:', uploadError instanceof Error ? uploadError.constructor.name : typeof uploadError);
    
    if (uploadError && typeof uploadError === 'object') {
      const errorObj = uploadError as any;
      if (errorObj.http_code) console.log('     HTTP Code:', errorObj.http_code);
      if (errorObj.error) console.log('     Error Object:', errorObj.error);
      console.log('     Full Error:', JSON.stringify(uploadError, null, 2));
    }
    
    if (uploadError instanceof Error && uploadError.stack) {
      console.log('     Stack:', uploadError.stack);
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testCloudinary().catch(console.error);