import type { Document as PrismaDocument, Folder as PrismaFolder, DocumentVersion as PrismaDocumentVersion, DocumentShare as PrismaDocumentShare } from '@prisma/client';

// Export enhanced Prisma types
export type Document = PrismaDocument;
export type Folder = PrismaFolder;
export type DocumentVersion = PrismaDocumentVersion;
export type DocumentShare = PrismaDocumentShare;

// Enhanced document type with relations
export type DocumentWithRelations = Document & {
  folder?: Folder;
  versions?: DocumentVersion[];
  shares?: DocumentShare[];
};

// Define enhanced status and source types
export type DocumentStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PENDING';
export type DocumentChannel = 'WEB_UPLOAD' | 'EMAIL' | 'WHATSAPP' | 'SHAREPOINT' | 'FILE_SYSTEM' | 'DROPBOX' | 'GOOGLE_DRIVE' | 'SLACK' | 'TEAMS';
export type AlertType = 'warning' | 'error' | 'info' | 'success';
export type SharePermission = 'READ' | 'write' | 'admin';

// Enhanced interfaces
export interface ProcessingResult {
  status: string;
  document_id?: number;
  department?: string;
  channel?: string;
  error?: string;
  processing_steps: string[];
  ml_results: Record<string, any>;
  thumbnail_generated?: boolean;
  text_extracted?: boolean;
}

export interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  result?: ProcessingResult;
  error?: string;
  folderId?: number;
  tags?: string[];
}

export interface SearchRequest {
  query?: string;
  department?: string;
  file_type?: string;
  channel?: DocumentChannel;
  folder_id?: number;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  is_favorite?: boolean;
  limit?: number;
  use_semantic?: boolean;
}

export interface SearchResponse {
  query?: string;
  total_documents: number;
  results: SearchResult[];
  search_method: string;
  individual_alerts: Alert[];
  summary_alerts: Alert[];
}

export interface SearchResult {
  id: number;
  filename: string;
  department: string;
  channel: DocumentChannel;
  file_type: string;
  file_size?: number;
  tags: string[];
  is_favorite: boolean;
  relevance_score: number;
  text_preview: string;
  processed_at: string;
  thumbnail_path?: string;
  folder?: Folder;
}

export interface Alert {
  type: AlertType;
  message: string;
  timestamp: string;
  document_id?: number;
}

export interface DashboardData {
  total_documents: number;
  processing_queue: number;
  failed_documents: number;
  storage_used: number;
  recent_uploads: Document[];
  department_stats: Record<string, number>;
  channel_stats: Record<DocumentChannel, number>;
  file_type_stats: Record<string, number>;
  alerts: Alert[];
}

export interface WebSocketMessage {
  type: 'document_uploaded' | 'document_processed' | 'system_alert' | 'processing_update';
  payload: any;
  timestamp: string;
}

export interface FolderTreeItem {
  id: number;
  name: string;
  parent_id?: number;
  children: FolderTreeItem[];
  document_count: number;
  color?: string;
}

export interface DocumentIntegration {
  id: number;
  type: DocumentChannel;
  name: string;
  is_active: boolean;
  last_sync?: string;
  settings: Record<string, any>;
}

export const DEPARTMENTS = [
  'ENGINEERING',
  'PROCUREMENT', 
  'HR',
  'FINANCE',
  'SAFETY',
  'OPERATIONS',
  'LEGAL',
  'REGULATORY',
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
  'TEAMS'
] as const;

export const SUPPORTED_FILE_TYPES = [
  // Documents
  'PDF', 'DOC', 'DOCX', 'TXT', 'RTF', 'ODT',
  // Spreadsheets
  'XLS', 'XLSX', 'CSV', 'ODS',
  // Presentations
  'PPT', 'PPTX', 'ODP',
  // Images
  'JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'TIFF', 'SVG', 'WEBP',
  // Videos
  'MP4', 'AVI', 'MOV', 'WMV', 'FLV', 'MKV', 'WEBM',
  // Audio
  'MP3', 'WAV', 'AAC', 'OGG', 'FLAC',
  // Archives
  'ZIP', 'RAR', '7Z', 'TAR', 'GZ',
  // Other
  'JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS'
] as const;

export const MIME_TYPE_ICONS: Record<string, string> = {
  // Documents
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'text/plain': '📄',
  // Spreadsheets
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'text/csv': '📊',
  // Presentations
  'application/vnd.ms-powerpoint': '📽️',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📽️',
  // Images
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/svg+xml': '🖼️',
  // Videos
  'video/mp4': '🎥',
  'video/avi': '🎥',
  'video/quicktime': '🎥',
  // Audio
  'audio/mpeg': '🎵',
  'audio/wav': '🎵',
  'audio/ogg': '🎵',
  // Archives
  'application/zip': '📦',
  'application/x-rar-compressed': '📦',
  'application/x-7z-compressed': '📦',
  // Default
  'default': '📁'
};