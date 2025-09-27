'use client';

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Navigation } from '@/components/ui/Navigation';
import { formatFileSize, getDepartmentColor, getFileTypeIcon, getChannelIcon } from '@/lib/utils';
import { DEPARTMENTS, SUPPORTED_FILE_TYPES, UploadedFile, FolderTreeItem } from '@/types';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  FolderIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [tags, setTags] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);

  // Fetch available folders
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array before setting it
        setFolders(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch folders:', response.statusText);
        setFolders([]);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      setFolders([]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      // Documents
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'application/vnd.oasis.opendocument.text': ['.odt'],
      
      // Spreadsheets
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
      
      // Presentations
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.oasis.opendocument.presentation': ['.odp'],
      
      // Images
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff'],
      'image/svg+xml': ['.svg'],
      'image/webp': ['.webp'],
      
      // Videos
      'video/mp4': ['.mp4'],
      'video/avi': ['.avi'],
      'video/quicktime': ['.mov'],
      'video/x-ms-wmv': ['.wmv'],
      'video/x-flv': ['.flv'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm'],
      
      // Audio
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/aac': ['.aac'],
      'audio/ogg': ['.ogg'],
      'audio/flac': ['.flac'],
      
      // Archives
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz'],
      
      // Other
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/html': ['.html'],
      'text/css': ['.css'],
      'application/javascript': ['.js'],
      'application/typescript': ['.ts']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast.error(`${rejectedFiles.length} file(s) rejected. Please check file type and size.`);
      }

      const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
        file,
        status: 'pending' as const,
        progress: 0,
        folderId: selectedFolder ? selectedFolder.toString() : undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  });

  const uploadFile = async (fileItem: UploadedFile, index: number) => {
    const formData = new FormData();
    formData.append('file', fileItem.file);
    formData.append('channel', 'WEB_UPLOAD');
    formData.append('uploader', 'web_user');
    formData.append('department', selectedDepartment);
    if (fileItem.folderId) {
      formData.append('folderId', fileItem.folderId.toString());
    }
    if (fileItem.tags && fileItem.tags.length > 0) {
      formData.append('tags', fileItem.tags.join(', '));
    }

    // Update status to uploading
    setUploadedFiles(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, status: 'uploading', error: undefined } : item
      )
    );

    try {
      console.log('Starting upload for:', fileItem.file.name);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map((item, i) => 
            i === index && item.progress < 90 
              ? { ...item, progress: item.progress + 10 } 
              : item
          )
        );
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);

      console.log('Upload response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful:', result);
        
        setUploadedFiles(prev => 
          prev.map((item, i) => 
            i === index 
              ? { ...item, status: 'completed', progress: 100, result } 
              : item
          )
        );
        
        // Show different messages based on database connection status
        if (result.database_connected) {
          toast.success(`${fileItem.file.name} uploaded and saved to database!`);
        } else {
          toast.success(`${fileItem.file.name} uploaded successfully! (Database offline - file saved locally)`);
        }
      } else {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || 'Unknown error occurred';
          console.error('Upload error details:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Upload failed for:', fileItem.file.name, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadedFiles(prev => 
        prev.map((item, i) => 
          i === index 
            ? { 
                ...item, 
                status: 'failed', 
                error: errorMessage,
                progress: 0 
              } 
            : item
        )
      );
      
      toast.error(`Failed to upload ${fileItem.file.name}: ${errorMessage}`);
    }
  };

  const uploadAllFiles = async () => {
    setIsUploading(true);
    const pendingFiles = uploadedFiles
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === 'pending');

    for (const { item, index } of pendingFiles) {
      await uploadFile(item, index);
    }
    setIsUploading(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const renderFolderOptions = (folders: FolderTreeItem[], level = 0): React.ReactElement[] => {
    // Safety check: ensure folders is an array and filter out invalid entries
    if (!Array.isArray(folders)) {
      return [];
    }

    return folders
      .filter(folder => folder?.id && folder?.name) // Use optional chaining
      .flatMap(folder => [
        <option key={folder.id} value={folder.id}>
          {'  '.repeat(level) + folder.name} ({folder.documentCount || 0})
        </option>,
        // Recursively render children, ensuring children is an array
        ...renderFolderOptions(Array.isArray(folder.children) ? folder.children : [], level + 1)
      ]);
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto pt-16 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Upload Documents</h1>
            <p className="text-muted-foreground">
              Upload documents from any source - supports all major file types including documents, images, videos, audio, and archives
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm dark:bg-blue-900/20 dark:text-blue-400">
                📄 Documents: PDF, DOC, DOCX, TXT, RTF, ODT
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm dark:bg-green-900/20 dark:text-green-400">
                📊 Spreadsheets: XLS, XLSX, CSV, ODS
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm dark:bg-purple-900/20 dark:text-purple-400">
                🖼️ Media: Images, Videos, Audio
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm dark:bg-orange-900/20 dark:text-orange-400">
                📦 Archives: ZIP, RAR, 7Z, TAR, GZ
              </span>
            </div>
          </div>

          {/* Upload Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Department Selection */}
            <div className="glass-card p-6 bg-card/50 border border-border/50">
              <label className="block text-sm font-medium text-foreground mb-2">
                <TagIcon className="w-4 h-4 inline mr-1" />
                Department (Optional)
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Auto-detect department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                AI will automatically classify if not selected
              </p>
            </div>

            {/* Folder Selection */}
            <div className="glass-card p-6 bg-card/50 border border-border/50">
              <label className="block text-sm font-medium text-foreground mb-2">
                <FolderIcon className="w-4 h-4 inline mr-1" />
                Folder (Optional)
              </label>
              <select
                value={selectedFolder || ''}
                onChange={(e) => setSelectedFolder(e.target.value ? parseInt(e.target.value) : null)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Root folder</option>
                {renderFolderOptions(folders)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Organize documents in folders
              </p>
            </div>

            {/* Tags */}
            <div className="glass-card p-6 bg-card/50 border border-border/50">
              <label className="block text-sm font-medium text-foreground mb-2">
                <TagIcon className="w-4 h-4 inline mr-1" />
                Tags (Optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated tags for better organization
              </p>
            </div>
          </div>

          {/* Upload Area */}
          <div className="glass-card p-6 mb-8 bg-card/50 border border-border/50">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-border/70'
              }`}
            >
              <input {...getInputProps()} />
              <CloudArrowUpIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              {isDragActive ? (
                <p className="text-lg text-primary">Drop files here...</p>
              ) : (
                <div>
                  <p className="text-lg text-foreground mb-2">
                    Drag & drop files here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports {SUPPORTED_FILE_TYPES.length}+ file types (max 100MB each)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground/80">
                    <div>📄 Documents</div>
                    <div>📊 Spreadsheets</div>
                    <div>📽️ Presentations</div>
                    <div>🖼️ Images</div>
                    <div>🎥 Videos</div>
                    <div>🎵 Audio</div>
                    <div>📦 Archives</div>
                    <div>💻 Code Files</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="glass-card p-6 bg-card/50 border border-border/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Files Queue ({uploadedFiles.length})
                </h3>
                <button
                  onClick={uploadAllFiles}
                  disabled={isUploading || uploadedFiles.every(f => f.status !== 'pending')}
                  className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isUploading ? 'Uploading...' : 'Upload All Files'}
                </button>
              </div>

              <div className="space-y-4">
                {uploadedFiles.map((fileItem, index) => (
                  <div key={index} className="flex items-center p-4 bg-muted/50 rounded-lg border border-border/50 hover:border-border/70 transition-colors">
                    <div className="flex-shrink-0 mr-4">
                      {getStatusIcon(fileItem.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">
                            {getFileTypeIcon(fileItem.file.name.split('.').pop()?.toUpperCase() || '', fileItem.file.type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground truncate max-w-xs">
                              {fileItem.file.name}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(fileItem.file.size)}</span>
                              <span>{fileItem.file.type || 'Unknown type'}</span>
                              {fileItem.folderId && (
                                <span className="inline-flex items-center">
                                  <FolderIcon className="w-3 h-3 mr-1" />
                                  Folder
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {fileItem.status === 'completed' && fileItem.result && (
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${getDepartmentColor(fileItem.result.department || '')}`}>
                              {fileItem.result.department || 'UNKNOWN'}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs dark:bg-blue-900/20 dark:text-blue-400">
                              {getChannelIcon(fileItem.result.channel || 'WEB_UPLOAD')} {fileItem.result.channel || 'WEB_UPLOAD'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {fileItem.tags && fileItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {fileItem.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Progress Bar */}
                      {fileItem.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${fileItem.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{fileItem.progress}% uploaded</p>
                        </div>
                      )}

                      {/* Error Message */}
                      {fileItem.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{fileItem.error}</p>
                      )}

                      {/* Success Info */}
                      {fileItem.status === 'completed' && fileItem.result && (
                        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                          ✓ Uploaded successfully • ID: {fileItem.result.documentId} • Processing: {fileItem.result.status}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeFile(index)}
                      className="ml-4 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      disabled={fileItem.status === 'uploading'}
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload Statistics */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {uploadedFiles.filter(f => f.status === 'pending').length}
                    </div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {uploadedFiles.filter(f => f.status === 'uploading').length}
                    </div>
                    <div className="text-muted-foreground">Uploading</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {uploadedFiles.filter(f => f.status === 'completed').length}
                    </div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {uploadedFiles.filter(f => f.status === 'failed').length}
                    </div>
                    <div className="text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}