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
      const uploadOptions = {
        resource_type: 'auto' as const,
        folder: options.folder ? `${this.baseFolder}/${options.folder}` : this.baseFolder,
        use_filename: options.use_filename ?? true,
        unique_filename: options.unique_filename ?? true,
        overwrite: options.overwrite ?? false,
        ...options,
      };

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result as CloudinaryUploadResult);
            }
          }
        ).end(buffer);
      });

      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error(`Failed to upload to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
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