import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"
import { SUPPORTED_FILE_TYPES, MIME_TYPE_ICONS, DocumentChannel } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to serialize BigInt values for JSON responses
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInt(value);
    }
    return serialized;
  }
  
  return obj;
}

// Custom JSON.stringify replacer for BigInt
export function bigIntReplacer(_key: string, value: any) {
  return typeof value === 'bigint' ? Number(value) : value;
}

export function formatBytes(bytes: number, opts: { decimals?: number; sizeType?: "accurate" | "normal" } = {}) {
  const { decimals = 0, sizeType = "normal" } = opts
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"]
  if (bytes === 0) return "0 Byte"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === "accurate" ? accurateSizes[i] ?? "Bytest" : sizes[i] ?? "Bytes"
  }`
}

export function formatFileSize(bytes: number): string {
  return formatBytes(bytes, { decimals: 1 })
}

export function validateFileType(file: File) {
  const maxSize = 100 * 1024 * 1024; // 100MB increased limit
  
  // Get file extension
  const extension = file.name.split('.').pop()?.toUpperCase() || '';
  
  // Check if file type is supported
  if (!SUPPORTED_FILE_TYPES.includes(extension as any)) {
    return {
      valid: false,
      error: `File type "${extension}" not supported. Supported types: ${SUPPORTED_FILE_TYPES.join(', ')}`
    };
  }
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)} limit.`
    };
  }
  
  return {
    valid: true
  };
}

export function getFileTypeIcon(fileType: string, mimeType?: string): string {
  if (mimeType && MIME_TYPE_ICONS[mimeType]) {
    return MIME_TYPE_ICONS[mimeType];
  }
  
  // Add null/undefined check
  if (!fileType) {
    return '📁'; // Default icon
  }
  
  const type = fileType.toUpperCase();
  
  // Document types
  if (['PDF'].includes(type)) return '📄';
  if (['DOC', 'DOCX', 'RTF', 'ODT'].includes(type)) return '📝';
  if (['TXT'].includes(type)) return '📄';
  
  // Spreadsheet types
  if (['XLS', 'XLSX', 'CSV', 'ODS'].includes(type)) return '📊';
  
  // Presentation types
  if (['PPT', 'PPTX', 'ODP'].includes(type)) return '📽️';
  
  // Image types
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'TIFF', 'SVG', 'WEBP'].includes(type)) return '🖼️';
  
  // Video types
  if (['MP4', 'AVI', 'MOV', 'WMV', 'FLV', 'MKV', 'WEBM'].includes(type)) return '🎥';
  
  // Audio types
  if (['MP3', 'WAV', 'AAC', 'OGG', 'FLAC'].includes(type)) return '🎵';
  
  // Archive types
  if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(type)) return '📦';
  
  // Code types
  if (['JSON', 'XML', 'HTML', 'CSS', 'JS', 'TS'].includes(type)) return '💻';
  
  return '📁'; // Default
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString()
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString()
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}

export function truncate(str: string, length: number) {
  return str.length > length ? `${str.substring(0, length)}...` : str
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-')
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    'ENGINEERING': 'bg-blue-100 text-blue-800',
    'PROCUREMENT': 'bg-green-100 text-green-800',
    'HR': 'bg-purple-100 text-purple-800',
    'FINANCE': 'bg-yellow-100 text-yellow-800',
    'SAFETY': 'bg-red-100 text-red-800',
    'OPERATIONS': 'bg-indigo-100 text-indigo-800',
    'LEGAL': 'bg-gray-100 text-gray-800',
    'REGULATORY': 'bg-orange-100 text-orange-800',
    'GENERAL': 'bg-gray-100 text-gray-600'
  };
  return colors[department] || colors['GENERAL'];
}

export function getChannelIcon(channel: DocumentChannel): string {
  const icons: Record<DocumentChannel, string> = {
    'WEB_UPLOAD': '🌐',
    'EMAIL': '📧',
    'WHATSAPP': '💬',
    'TELEGRAM': '✈️',
    'SHAREPOINT': '🔗',
    'FILE_SYSTEM': '💾',
    'DROPBOX': '📦',
    'GOOGLE_DRIVE': '☁️',
    'SLACK': '💬',
    'TEAMS': '👥',
    'API': '🔌'
  };
  return icons[channel] || '📁';
}

export function getChannelColor(channel: DocumentChannel): string {
  const colors: Record<DocumentChannel, string> = {
    'WEB_UPLOAD': 'bg-blue-100 text-blue-800',
    'EMAIL': 'bg-red-100 text-red-800',
    'WHATSAPP': 'bg-green-100 text-green-800',
    'TELEGRAM': 'bg-cyan-100 text-cyan-800',
    'SHAREPOINT': 'bg-blue-100 text-blue-800',
    'FILE_SYSTEM': 'bg-gray-100 text-gray-800',
    'DROPBOX': 'bg-blue-100 text-blue-800',
    'GOOGLE_DRIVE': 'bg-yellow-100 text-yellow-800',
    'SLACK': 'bg-purple-100 text-purple-800',
    'TEAMS': 'bg-blue-100 text-blue-800',
    'API': 'bg-orange-100 text-orange-800'
  };
  return colors[channel] || 'bg-gray-100 text-gray-600';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'PENDING': 'bg-yellow-100 text-yellow-800',
    'PROCESSING': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'FAILED': 'bg-red-100 text-red-800',
    'PROCESSED': 'bg-green-100 text-green-800', // Alternative status name
    'UNKNOWN': 'bg-gray-100 text-gray-600'
  };
  return colors[status.toUpperCase()] || colors['UNKNOWN'];
}

export function generateThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set thumbnail size
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function extractTextFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string || null);
      };
      reader.readAsText(file);
    } else {
      // For other file types, we would need server-side processing
      resolve(null);
    }
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}

export function isDocumentFile(file: File): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return documentTypes.includes(file.type);
}

export function buildFolderPath(folders: any[], folderId?: number): string {
  if (!folderId) return '/';
  
  const path: string[] = [];
  let currentFolder = folders.find(f => f.id === folderId);
  
  while (currentFolder) {
    path.unshift(currentFolder.name);
    currentFolder = folders.find(f => f.id === currentFolder?.parent_id);
  }
  
  return '/' + path.join('/');
}

export function searchInText(text: string, query: string): boolean {
  if (!text || !query) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}