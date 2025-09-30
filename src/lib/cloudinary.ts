import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
  version: number;
  created_at: string;
  folder?: string;
  original_filename: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  format?: string;
  transformation?: any[];
  tags?: string[];
  context?: Record<string, string>;
  use_filename?: boolean;
  unique_filename?: boolean;
  overwrite?: boolean;
}

class CloudinaryService {
  private baseFolder: string;

  constructor() {
    this.baseFolder = process.env.CLOUDINARY_FOLDER || 'documents-organizer';
  }

  /**
   * Upload file buffer to Cloudinary
   */
  async uploadBuffer(
    buffer: Buffer,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      // Add comprehensive validation before attempting upload
      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer is empty or invalid');
      }

      // Check Cloudinary configuration
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary configuration is incomplete. Missing: ' + 
          [
            !process.env.CLOUDINARY_CLOUD_NAME ? 'CLOUDINARY_CLOUD_NAME' : null,
            !process.env.CLOUDINARY_API_KEY ? 'CLOUDINARY_API_KEY' : null,
            !process.env.CLOUDINARY_API_SECRET ? 'CLOUDINARY_API_SECRET' : null
          ].filter(Boolean).join(', ')
        );
      }

      console.log('Cloudinary upload starting:', {
        bufferSize: buffer.length,
        folder: options.folder ? `${this.baseFolder}/${options.folder}` : this.baseFolder,
        resourceType: options.resource_type || 'auto'
      });

      const uploadOptions = {
        resource_type: 'auto' as const,
        folder: options.folder ? `${this.baseFolder}/${options.folder}` : this.baseFolder,
        use_filename: options.use_filename ?? true,
        unique_filename: options.unique_filename ?? true,
        overwrite: options.overwrite ?? false,
        ...options,
      };

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload stream error:', {
                message: error.message,
                http_code: error.http_code,
                error: error.error,
                stack: error.stack
              });
              reject(error);
            } else if (!result) {
              console.error('Cloudinary upload returned no result');
              reject(new Error('Upload completed but no result returned'));
            } else {
              console.log('Cloudinary upload successful:', {
                public_id: result.public_id,
                secure_url: result.secure_url,
                bytes: result.bytes,
                format: result.format
              });
              resolve(result as CloudinaryUploadResult);
            }
          }
        );

        // Handle stream errors
        uploadStream.on('error', (streamError) => {
          console.error('Cloudinary upload stream error:', streamError);
          reject(streamError);
        });

        // End the stream with the buffer
        uploadStream.end(buffer);
      });

      return result;
    } catch (error) {
      console.error('Cloudinary upload error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        http_code: error && typeof error === 'object' && 'http_code' in error ? (error as any).http_code : undefined,
        error_details: error && typeof error === 'object' && 'error' in error ? (error as any).error : undefined,
        name: error instanceof Error ? error.name : undefined,
        bufferSize: buffer?.length || 0,
        cloudinaryConfigured: this.isConfigured()
      });

      // Provide more specific error messages based on error type
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        const cloudinaryError = error as any;
        if (cloudinaryError.http_code && cloudinaryError.error) {
          errorMessage = `HTTP ${cloudinaryError.http_code}: ${cloudinaryError.error.message || cloudinaryError.error}`;
        } else if (cloudinaryError.message) {
          errorMessage = cloudinaryError.message;
        } else {
          errorMessage = JSON.stringify(error);
        }
      }

      throw new Error(`Failed to upload to Cloudinary: ${errorMessage}`);
    }
  }

  /**
   * Upload file from File object (browser)
   */
  async uploadFile(
    file: File,
    options: CloudinaryUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer());
    return this.uploadBuffer(buffer, {
      ...options,
      public_id: options.public_id || this.generatePublicId(file.name),
    });
  }

  /**
   * Upload document file
   */
  async uploadDocument(
    buffer: Buffer,
    filename: string,
    userId: string,
    organizationId?: string,
    additionalOptions: Partial<CloudinaryUploadOptions> = {}
  ): Promise<CloudinaryUploadResult> {
    const folder = organizationId 
      ? `documents/organizations/${organizationId}` 
      : `documents/users/${userId}`;

    const publicId = this.generatePublicId(filename);
    
    return this.uploadBuffer(buffer, {
      folder,
      public_id: publicId,
      resource_type: 'auto',
      tags: ['document', userId, ...(organizationId ? [organizationId] : [])],
      context: {
        user_id: userId,
        ...(organizationId && { organization_id: organizationId }),
        original_filename: filename,
        upload_type: 'document',
      },
      ...additionalOptions,
    });
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(
    buffer: Buffer,
    userId: string,
    filename: string
  ): Promise<CloudinaryUploadResult> {
    const publicId = `avatar_${userId}_${Date.now()}`;
    
    return this.uploadBuffer(buffer, {
      folder: 'avatars',
      public_id: publicId,
      resource_type: 'image',
      tags: ['avatar', userId],
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      context: {
        user_id: userId,
        upload_type: 'avatar',
        original_filename: filename,
      },
      overwrite: true,
    });
  }

  /**
   * Upload thumbnail
   */
  async uploadThumbnail(
    buffer: Buffer,
    documentId: string,
    originalFormat: string
  ): Promise<CloudinaryUploadResult> {
    const publicId = `thumb_${documentId}`;
    
    return this.uploadBuffer(buffer, {
      folder: 'thumbnails',
      public_id: publicId,
      resource_type: 'image',
      format: 'jpg',
      tags: ['thumbnail', documentId],
      transformation: [
        { width: 300, height: 400, crop: 'fit' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      context: {
        document_id: documentId,
        upload_type: 'thumbnail',
        original_format: originalFormat,
      },
      overwrite: true,
    });
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'raw'): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error(`Failed to delete from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate optimized URL for different use cases
   */
  generateUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
      secure?: boolean;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
    } = {}
  ): string {
    // Determine resource type based on file extension if not provided
    let resourceType = options.resourceType || 'auto';
    
    // For document files, explicitly use 'raw' resource type
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];
    const publicIdLower = publicId.toLowerCase();
    
    if (documentExtensions.some(ext => publicIdLower.includes(`.${ext}`) || publicIdLower.endsWith(`_${ext}`))) {
      resourceType = 'raw';
    }

    return cloudinary.url(publicId, {
      secure: options.secure ?? true,
      resource_type: resourceType,
      quality: options.quality || 'auto',
      fetch_format: options.format || 'auto',
      ...(options.width && { width: options.width }),
      ...(options.height && { height: options.height }),
      ...(options.crop && { crop: options.crop }),
    });
  }

  /**
   * Generate document delivery URL with proper authentication
   */
  generateDocumentUrl(publicId: string, fileType?: string): string {
    const documentFileTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];
    const isDocument = fileType && documentFileTypes.includes(fileType.toLowerCase());
    
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: isDocument ? 'raw' : 'auto',
      sign_url: false, // Don't sign URLs as they should be publicly accessible
      quality: 'auto',
    });
  }

  /**
   * Generate thumbnail URL
   */
  generateThumbnailUrl(publicId: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
    const sizes = {
      small: { width: 150, height: 200 },
      medium: { width: 300, height: 400 },
      large: { width: 600, height: 800 },
    };

    return this.generateUrl(publicId, {
      ...sizes[size],
      crop: 'fit',
      quality: 'auto',
      format: 'jpg',
    });
  }

  /**
   * Generate avatar URL
   */
  generateAvatarUrl(publicId: string, size: number = 150): string {
    return this.generateUrl(publicId, {
      width: size,
      height: size,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Get file info from Cloudinary
   */
  async getFileInfo(publicId: string): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      console.error('Error fetching file info:', error);
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder: string, maxResults: number = 100): Promise<any[]> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: `${this.baseFolder}/${folder}`,
        max_results: maxResults,
      });
      return result.resources;
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate unique public ID
   */
  private generatePublicId(filename: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    return `${timestamp}_${randomStr}_${cleanFilename}`;
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      const regex = /\/([^\/]+)\.[^\/]+$/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Test Cloudinary connection and configuration
   */
  async testConnection(): Promise<{
    configured: boolean;
    connected: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      // Check if configured
      const configured = this.isConfigured();
      if (!configured) {
        return {
          configured: false,
          connected: false,
          error: 'Cloudinary not configured - missing environment variables'
        };
      }

      // Try to ping Cloudinary API
      const result = await cloudinary.api.ping();
      
      return {
        configured: true,
        connected: true,
        details: {
          status: result.status,
          cloudName: process.env.CLOUDINARY_CLOUD_NAME,
          baseFolder: this.baseFolder
        }
      };
    } catch (error) {
      console.error('Cloudinary connection test failed:', error);
      return {
        configured: this.isConfigured(),
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        details: error
      };
    }
  }

  /**
   * Check if Cloudinary is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();
export { cloudinary };
export default cloudinaryService;