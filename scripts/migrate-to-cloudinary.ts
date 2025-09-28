import { PrismaClient } from '@prisma/client';
import { cloudinaryService } from '../src/lib/cloudinary';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface MigrationStats {
  totalDocuments: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ documentId: string; filename: string; error: string }>;
}

async function migrateDocumentsToCloudinary() {
  console.log('🚀 Starting migration of documents from local storage to Cloudinary...\n');

  // Check if Cloudinary is configured
  if (!cloudinaryService.isConfigured()) {
    console.error('❌ Cloudinary is not configured. Please set the following environment variables:');
    console.error('   - CLOUDINARY_CLOUD_NAME');
    console.error('   - CLOUDINARY_API_KEY');
    console.error('   - CLOUDINARY_API_SECRET');
    process.exit(1);
  }

  const stats: MigrationStats = {
    totalDocuments: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get all documents that don't have Cloudinary URLs yet
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { cloudinaryUrl: null },
          { cloudinaryUrl: '' },
          { cloudinaryPublicId: null },
          { cloudinaryPublicId: '' }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    stats.totalDocuments = documents.length;
    console.log(`📊 Found ${documents.length} documents to migrate\n`);

    if (documents.length === 0) {
      console.log('✅ No documents need migration. All documents are already in Cloudinary!');
      return;
    }

    // Process documents in batches to avoid overwhelming Cloudinary
    const batchSize = 5;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} (${batch.length} documents)`);

      await Promise.all(batch.map(async (document) => {
        try {
          await migrateDocument(document, stats);
        } catch (error) {
          console.error(`❌ Failed to migrate document ${document.id}:`, error);
          stats.failed++;
          stats.errors.push({
            documentId: document.id,
            filename: document.filename,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }));

      // Add a small delay between batches
      if (i + batchSize < documents.length) {
        console.log('⏳ Waiting 2 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Print migration summary
    printMigrationSummary(stats);

  } catch (error) {
    console.error('💥 Migration failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function migrateDocument(document: any, stats: MigrationStats): Promise<void> {
  const documentId = document.id;
  const filename = document.filename;
  
  console.log(`  📄 Migrating: ${filename} (ID: ${documentId})`);

  // Skip if already has Cloudinary URL
  if (document.cloudinaryUrl && document.cloudinaryPublicId) {
    console.log(`  ⏭️  Skipped: ${filename} (already in Cloudinary)`);
    stats.skipped++;
    return;
  }

  // Find the local file
  const possiblePaths = [
    // Current path as stored in database
    path.join(process.cwd(), document.originalPath),
    // Remove leading slash if present
    path.join(process.cwd(), document.originalPath.replace(/^\//, '')),
    // Try various upload directories
    path.join(process.cwd(), 'uploads', 'web_upload', filename),
    path.join(process.cwd(), 'uploads', 'web', filename),
    path.join(process.cwd(), 'uploads', 'users', document.userId, filename),
    path.join(process.cwd(), 'uploads', 'organizations', document.organizationId || 'temp', filename),
  ];

  let filePath: string | null = null;
  for (const tryPath of possiblePaths) {
    if (fs.existsSync(tryPath)) {
      filePath = tryPath;
      break;
    }
  }

  if (!filePath) {
    console.log(`  ⚠️  File not found locally: ${filename} - marking as missing`);
    
    // Update document to mark as missing file
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: 'Local file not found during Cloudinary migration',
        updatedAt: new Date()
      }
    });
    
    stats.failed++;
    stats.errors.push({
      documentId,
      filename,
      error: 'Local file not found'
    });
    return;
  }

  try {
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`  📖 Read file: ${filename} (${fileBuffer.length} bytes)`);

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinaryService.uploadDocument(
      fileBuffer,
      filename,
      document.userId,
      document.organizationId
    );

    console.log(`  ☁️  Uploaded to Cloudinary: ${cloudinaryResult.public_id}`);

    // Generate thumbnail for images
    let thumbnailResult = null;
    if (document.mimeType?.startsWith('image/') && !document.mimeType.includes('svg')) {
      try {
        thumbnailResult = await cloudinaryService.uploadThumbnail(
          fileBuffer,
          documentId,
          cloudinaryResult.format
        );
        console.log(`  🖼️  Generated thumbnail: ${thumbnailResult.public_id}`);
      } catch (thumbnailError) {
        console.log(`  ⚠️  Thumbnail generation failed: ${thumbnailError}`);
        // Don't fail the migration if thumbnail fails
      }
    }

    // Update document in database with Cloudinary URLs
    await prisma.document.update({
      where: { id: documentId },
      data: {
        cloudinaryUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        originalPath: cloudinaryResult.secure_url, // Update original path to Cloudinary URL
        thumbnailPath: thumbnailResult?.secure_url || document.thumbnailPath,
        thumbnailPublicId: thumbnailResult?.public_id || document.thumbnailPublicId,
        updatedAt: new Date(),
        // Update metadata to include Cloudinary info
        metaData: {
          ...((document.metaData as any) || {}),
          cloudinary: {
            public_id: cloudinaryResult.public_id,
            secure_url: cloudinaryResult.secure_url,
            format: cloudinaryResult.format,
            resource_type: cloudinaryResult.resource_type,
            bytes: cloudinaryResult.bytes,
            migrated_at: new Date().toISOString(),
            original_local_path: filePath
          }
        }
      }
    });

    console.log(`  ✅ Successfully migrated: ${filename}`);
    stats.migrated++;

  } catch (error) {
    console.log(`  ❌ Migration failed: ${filename} - ${error}`);
    
    // Update document status to indicate migration failure
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: `Cloudinary migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedAt: new Date()
      }
    });

    stats.failed++;
    stats.errors.push({
      documentId,
      filename,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function printMigrationSummary(stats: MigrationStats): void {
  console.log('\n📋 Migration Summary');
  console.log('='.repeat(50));
  console.log(`📊 Total documents: ${stats.totalDocuments}`);
  console.log(`✅ Successfully migrated: ${stats.migrated}`);
  console.log(`⏭️  Skipped (already migrated): ${stats.skipped}`);
  console.log(`❌ Failed: ${stats.failed}`);
  
  const successRate = stats.totalDocuments > 0 
    ? ((stats.migrated + stats.skipped) / stats.totalDocuments * 100).toFixed(1)
    : '0';
  console.log(`📈 Success rate: ${successRate}%`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Migration Errors:');
    console.log('-'.repeat(50));
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.filename} (${error.documentId})`);
      console.log(`   Error: ${error.error}\n`);
    });
  }

  if (stats.migrated > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Test document access in your application');
    console.log('   2. Verify thumbnails are working correctly');
    console.log('   3. Consider cleaning up local files after verification');
    console.log('   4. Update your backup strategy to include Cloudinary');
  }

  if (stats.failed > 0) {
    console.log('\n⚠️  Some documents failed to migrate. Please:');
    console.log('   1. Check the error messages above');
    console.log('   2. Verify Cloudinary configuration and quotas');
    console.log('   3. Re-run migration for failed documents');
    console.log('   4. Consider manual intervention for persistent failures');
  }
}

// Allow running the script directly
if (require.main === module) {
  migrateDocumentsToCloudinary().catch(console.error);
}

export { migrateDocumentsToCloudinary };