import type { 
  User as PrismaUser,
  Account as PrismaAccount,
  Session as PrismaSession,
  Organization as PrismaOrganization,
  OrganizationMember as PrismaOrganizationMember,
  Document as PrismaDocument, 
  Folder as PrismaFolder, 
  DocumentVersion as PrismaDocumentVersion, 
  DocumentShare as PrismaDocumentShare,
  DocumentEmbedding as PrismaDocumentEmbedding,
  UserIntegration as PrismaUserIntegration,
  UserPreference as PrismaUserPreference,
  UserType,
  OrganizationType,
  OrganizationRole,
  DocumentChannel,
  DocumentStatus,
  DocumentVisibility,
  FolderVisibility,
  SharePermission,
  IntegrationType
} from '@prisma/client';

// NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
    }
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}

// Export enhanced Prisma types
export type User = PrismaUser;
export type Account = PrismaAccount;
export type Session = PrismaSession;
export type Organization = PrismaOrganization;
export type OrganizationMember = PrismaOrganizationMember;
export type Document = PrismaDocument;
export type Folder = PrismaFolder;
export type DocumentVersion = PrismaDocumentVersion;
export type DocumentShare = PrismaDocumentShare;
export type DocumentEmbedding = PrismaDocumentEmbedding;
export type UserIntegration = PrismaUserIntegration;
export type UserPreference = PrismaUserPreference;

// Export enums
export { 
  UserType, 
  OrganizationType, 
  OrganizationRole, 
  DocumentChannel, 
  DocumentStatus, 
  DocumentVisibility, 
  FolderVisibility, 
  SharePermission, 
  IntegrationType 
};

// Enhanced document type with relations
export type DocumentWithRelations = Document & {
  user?: User;
  organization?: Organization;
  folder?: Folder;
  versions?: DocumentVersion[];
  shares?: DocumentShare[];
  embeddings?: DocumentEmbedding[];
};

// Enhanced folder type with relations
export type FolderWithRelations = Folder & {
  user?: User;
  organization?: Organization;
  parent?: Folder;
  children?: Folder[];
  documents?: Document[];
};

// User with relations
export type UserWithRelations = User & {
  organizations?: OrganizationMember[];
  documents?: Document[];
  folders?: Folder[];
  preferences?: UserPreference;
  integrations?: UserIntegration[];
};

// Organization with relations
export type OrganizationWithRelations = Organization & {
  members?: (OrganizationMember & { user: User })[];
  documents?: Document[];
  folders?: Folder[];
};

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  userType: UserType;
  profession?: string;
  currentOrganization?: string; // Current active organization ID
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  userType: UserType;
  profession?: string;
}

export interface OrganizationInvite {
  email: string;
  role: OrganizationRole;
  organizationId: string;
  permissions?: string[];
}

// Enhanced processing result
export interface ProcessingResult {
  status: DocumentStatus;
  documentId?: string;
  department?: string;
  channel?: DocumentChannel;
  error?: string;
  processingSteps: string[];
  mlResults: Record<string, any>;
  thumbnailGenerated?: boolean;
  textExtracted?: boolean;
  embeddingsGenerated?: boolean;
}

export interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  result?: ProcessingResult;
  error?: string;
  folderId?: string;
  tags?: string[];
  visibility?: DocumentVisibility;
}

// Enhanced search with multi-user support
export interface SearchRequest {
  query?: string;
  department?: string;
  fileType?: string;
  channel?: DocumentChannel;
  folderId?: string;
  tags?: string[];
  userId?: string;
  organizationId?: string;
  visibility?: DocumentVisibility[];
  dateFrom?: string;
  dateTo?: string;
  isFavorite?: boolean;
  limit?: number;
  offset?: number;
  useSemanticSearch?: boolean;
  includeFolders?: boolean;
}

export interface SearchResult {
  id: string;
  filename: string;
  department?: string;
  channel: DocumentChannel;
  fileType: string;
  fileSize?: number;
  tags: string[];
  isFavorite: boolean;
  relevanceScore: number;
  textPreview: string;
  processedAt?: string;
  thumbnailPath?: string;
  folder?: Folder;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  organization?: Pick<Organization, 'id' | 'name'>;
  visibility: DocumentVisibility;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
}

export interface SearchResponse {
  query?: string;
  totalDocuments: number;
  totalFolders?: number;
  results: SearchResult[];
  folders?: FolderSearchResult[];
  searchMethod: 'semantic' | 'keyword' | 'hybrid';
  processingTime: number;
  suggestions?: string[];
  filters: {
    departments: string[];
    fileTypes: string[];
    channels: DocumentChannel[];
    users: Pick<User, 'id' | 'name'>[];
    organizations: Pick<Organization, 'id' | 'name'>[];
  };
}

export interface FolderSearchResult {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  user?: Pick<User, 'id' | 'name'>;
  organization?: Pick<Organization, 'id' | 'name'>;
  visibility: FolderVisibility;
  canAccess: boolean;
}

export interface Alert {
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  documentId?: string;
  userId?: string;
  organizationId?: string;
}

// Enhanced dashboard data with multi-user support
export interface DashboardData {
  totalDocuments: number;
  processingQueue: number;
  failedDocuments: number;
  storageUsed: number;
  organizationStorageUsed?: number;
  recentUploads: DocumentWithRelations[];
  departmentStats: Record<string, number>;
  channelStats: Record<DocumentChannel, number>;
  fileTypeStats: Record<string, number>;
  userStats?: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  };
  organizationStats?: {
    totalOrganizations: number;
    documentsShared: number;
    collaborations: number;
  };
  alerts: Alert[];
}

export interface WebSocketMessage {
  type: 'document_uploaded' | 'document_processed' | 'system_alert' | 'processing_update' | 'user_activity';
  payload: any;
  timestamp: string;
  userId?: string;
  organizationId?: string;
}

export interface FolderTreeItem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  children: FolderTreeItem[];
  documentCount: number;
  color?: string;
  visibility: FolderVisibility;
  canEdit: boolean;
  canDelete: boolean;
  user?: Pick<User, 'id' | 'name'>;
  organization?: Pick<Organization, 'id' | 'name'>;
}

export interface DocumentIntegration {
  id: string;
  type: IntegrationType;
  name: string;
  isActive: boolean;
  lastSync?: string;
  settings: Record<string, any>;
  userId: string;
  syncStatus: 'idle' | 'syncing' | 'error';
  documentsImported: number;
  lastError?: string;
}

// Permission and access control types
export interface Permission {
  action: 'read' | 'write' | 'delete' | 'share' | 'admin';
  resource: 'document' | 'folder' | 'organization' | 'user';
  conditions?: Record<string, any>;
}

export interface AccessContext {
  userId: string;
  organizationId?: string;
  role?: OrganizationRole;
  permissions: Permission[];
}

// Sharing and collaboration types
export interface ShareRequest {
  documentId: string;
  userEmails: string[];
  permission: SharePermission;
  message?: string;
  expiresAt?: Date;
}

export interface CollaborationActivity {
  id: string;
  type: 'document_shared' | 'document_commented' | 'folder_created' | 'organization_joined';
  userId: string;
  userName: string;
  resourceId: string;
  resourceName: string;
  timestamp: string;
  organizationId?: string;
}

// Constants
export const DEPARTMENTS = [
  'ENGINEERING',
  'PROCUREMENT', 
  'HR',
  'FINANCE',
  'SAFETY',
  'OPERATIONS',
  'LEGAL',
  'REGULATORY',
  'ACADEMIC',     // For educational institutions
  'RESEARCH',     // For research organizations
  'MARKETING',    // For business organizations
  'GENERAL'
] as const;

export const DOCUMENT_CHANNELS = [
  'WEB_UPLOAD',
  'EMAIL',
  'WHATSAPP',
  'SHAREPOINT',
  'FILE_SYSTEM',
  'DROPBOX',
  'GOOGLE_DRIVE',
  'SLACK',
  'TEAMS',
  'API'
] as const;

export const SUPPORTED_FILE_TYPES = [
  // Documents
  'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
  // Spreadsheets
  'xls', 'xlsx', 'csv', 'ods',
  // Presentations
  'ppt', 'pptx', 'odp',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg', 'webp',
  // Videos
  'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv',
  // Audio
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz',
  // Other
  'json', 'xml', 'yaml', 'md', 'html', 'css', 'js', 'ts'
] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_ORGANIZATION_STORAGE = 10 * 1024 * 1024 * 1024; // 10GB
export const MAX_INDIVIDUAL_STORAGE = 1 * 1024 * 1024 * 1024; // 1GB

// MIME type to icon mapping for UI display
export const MIME_TYPE_ICONS: Record<string, string> = {
  // Documents
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'text/plain': '📄',
  'text/rtf': '📄',
  'application/vnd.oasis.opendocument.text': '📝',
  
  // Spreadsheets
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/csv': '📊',
  'application/vnd.oasis.opendocument.spreadsheet': '📊',
  
  // Presentations
  'application/vnd.ms-powerpoint': '📺',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📺',
  'application/vnd.oasis.opendocument.presentation': '📺',
  
  // Images
  'image/jpeg': '🖼️',
  'image/jpg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/bmp': '🖼️',
  'image/tiff': '🖼️',
  'image/svg+xml': '🖼️',
  'image/webp': '🖼️',
  
  // Videos
  'video/mp4': '🎥',
  'video/avi': '🎥',
  'video/quicktime': '🎥',
  'video/x-ms-wmv': '🎥',
  'video/x-flv': '🎥',
  'video/webm': '🎥',
  'video/x-matroska': '🎥',
  
  // Audio
  'audio/mpeg': '🎵',
  'audio/wav': '🎵',
  'audio/flac': '🎵',
  'audio/aac': '🎵',
  'audio/ogg': '🎵',
  'audio/x-ms-wma': '🎵',
  
  // Archives
  'application/zip': '📦',
  'application/x-rar-compressed': '📦',
  'application/x-7z-compressed': '📦',
  'application/x-tar': '📦',
  'application/gzip': '📦',
  
  // Code and markup
  'application/json': '📋',
  'application/xml': '📋',
  'text/yaml': '📋',
  'text/markdown': '📋',
  'text/html': '🌐',
  'text/css': '🎨',
  'application/javascript': '⚙️',
  'application/typescript': '⚙️',
  
  // Default fallback
  'application/octet-stream': '📁',
  'unknown': '📁'
};

// Helper function to get icon by file extension
export const getFileTypeIcon = (fileType: string, mimeType?: string): string => {
  // First try by MIME type
  if (mimeType && MIME_TYPE_ICONS[mimeType]) {
    return MIME_TYPE_ICONS[mimeType];
  }
  
  // Then try by file extension
  const extension = fileType.toLowerCase();
  const extensionToMimeType: Record<string, string> = {
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'text/rtf',
    'odt': 'application/vnd.oasis.opendocument.text',
    
    // Spreadsheets
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'ods': 'application/vnd.oasis.opendocument.spreadsheet',
    
    // Presentations
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'odp': 'application/vnd.oasis.opendocument.presentation',
    
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Code and markup
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript'
  };
  
  const mappedMimeType = extensionToMimeType[extension];
  if (mappedMimeType && MIME_TYPE_ICONS[mappedMimeType]) {
    return MIME_TYPE_ICONS[mappedMimeType];
  }
  
  // Default fallback
  return MIME_TYPE_ICONS['unknown'];
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  userId?: string;
}

export type AlertType = 'warning' | 'error' | 'info' | 'success';