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
  TagIcon,
  ChevronRightIcon,
  HomeIcon,
  EyeIcon,
  FolderOpenIcon,
  ArrowLeftIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

interface FolderBrowseMode {
  isActive: boolean;
  currentFolder: FolderTreeItem | null;
  breadcrumb: FolderTreeItem[];
  viewMode: 'grid' | 'list';
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [tags, setTags] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  
  // Folder browsing state
  const [folderBrowse, setFolderBrowse] = useState<FolderBrowseMode>({
    isActive: false,
    currentFolder: null,
    breadcrumb: [],
    viewMode: 'grid'
  });

  // Fetch available folders
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        setFolders(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error('Failed to fetch folders:', response.statusText);
        setFolders([]);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      setFolders([]);
    }
  };

  // Folder browsing functions
  const handleShowFolders = () => {
    setFolderBrowse(prev => ({
      ...prev,
      isActive: true,
      currentFolder: null,
      breadcrumb: []
    }));
  };

  const handleFolderClick = (folder: FolderTreeItem) => {
    const newBreadcrumb = [...folderBrowse.breadcrumb, folder];
    setFolderBrowse(prev => ({
      ...prev,
      currentFolder: folder,
      breadcrumb: newBreadcrumb
    }));
    setSelectedFolder(parseInt(folder.id));
  };

  const handleExitFolderBrowse = () => {
    setFolderBrowse({
      isActive: false,
      currentFolder: null,
      breadcrumb: [],
      viewMode: 'grid'
    });
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Clicked on "All Folders"
      setFolderBrowse(prev => ({
        ...prev,
        currentFolder: null,
        breadcrumb: []
      }));
      setSelectedFolder(null);
    } else {
      const newBreadcrumb = folderBrowse.breadcrumb.slice(0, index + 1);
      const targetFolder = newBreadcrumb[index];
      
      setFolderBrowse(prev => ({
        ...prev,
        currentFolder: targetFolder,
        breadcrumb: newBreadcrumb
      }));
      
      setSelectedFolder(parseInt(targetFolder.id));
    }
  };

  // Get folders to display based on current folder
  const getCurrentFolders = (): FolderTreeItem[] => {
    if (!folderBrowse.currentFolder) {
      return folders; // Show root folders
    }
    return folderBrowse.currentFolder.children || [];
  };

  // Flatten folders for dropdown (existing functionality)
  const flattenFolders = (folders: FolderTreeItem[], level = 0): any[] => {
    if (!Array.isArray(folders)) return [];
    
    return folders.reduce((acc, folder) => {
      if (folder?.id && folder?.name) {
        acc.push({
          id: folder.id,
          name: '  '.repeat(level) + folder.name,
          documentCount: folder.documentCount || 0
        });
        
        if (Array.isArray(folder.children) && folder.children.length > 0) {
          acc.push(...flattenFolders(folder.children, level + 1));
        }
      }
      return acc;
    }, [] as any[]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'video/mp4': ['.mp4'],
      'audio/mpeg': ['.mp3'],
      'application/zip': ['.zip']
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

      if (response.ok) {
        const result = await response.json();
        
        setUploadedFiles(prev => 
          prev.map((item, i) => 
            i === index 
              ? { ...item, status: 'completed', progress: 100, result } 
              : item
          )
        );
        
        toast.success(`${fileItem.file.name} uploaded successfully!`);
      } else {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || 'Unknown error occurred';
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
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

  const renderFolderOptions = (): React.ReactElement[] => {
    const flatFolders = flattenFolders(folders);
    return flatFolders.map(folder => (
      <option key={folder.id} value={folder.id}>
        {folder.name} ({folder.documentCount})
      </option>
    ));
  };

  // Render folder browsing interface
  const renderFolderBrowser = () => {
    const currentFolders = getCurrentFolders();
    
    return (
      <div className="glass-card p-6 mb-8 bg-card/50 border border-border/50">
        {/* Browser Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleExitFolderBrowse}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Upload
            </button>
            
            <div className="h-6 w-px bg-border"></div>
            
            <h3 className="text-lg font-semibold text-foreground">Browse Folders</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex rounded-lg border border-input bg-background">
              <button
                onClick={() => setFolderBrowse(prev => ({ ...prev, viewMode: 'grid' }))}
                className={`p-2 rounded-l-lg transition-colors ${
                  folderBrowse.viewMode === 'grid' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFolderBrowse(prev => ({ ...prev, viewMode: 'list' }))}
                className={`p-2 rounded-r-lg transition-colors ${
                  folderBrowse.viewMode === 'list' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent'
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 mb-6 text-sm">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`flex items-center px-3 py-1 rounded-md transition-colors ${
              !folderBrowse.currentFolder 
                ? 'bg-primary/10 text-primary' 
                : 'hover:bg-accent text-muted-foreground'
            }`}
          >
            <HomeIcon className="w-4 h-4 mr-1" />
            All Folders
          </button>
          
          {folderBrowse.breadcrumb.map((folder, index) => (
            <div key={folder.id} className="flex items-center">
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground mx-1" />
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`flex items-center px-3 py-1 rounded-md transition-colors ${
                  index === folderBrowse.breadcrumb.length - 1
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent text-muted-foreground'
                }`}
                style={{ color: folder.color }}
              >
                <FolderIcon className="w-4 h-4 mr-1" />
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {/* Current Folder Info */}
        {folderBrowse.currentFolder && (
          <div className="mb-6 p-4 rounded-lg border border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: folderBrowse.currentFolder.color || '#3B82F6' }}
                >
                  <FolderOpenIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{folderBrowse.currentFolder.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {folderBrowse.currentFolder.documentCount || 0} documents
                    {currentFolders.length > 0 && ` • ${currentFolders.length} subfolders`}
                  </p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full dark:bg-green-900/20 dark:text-green-400">
                📁 Selected for Upload
              </span>
            </div>
          </div>
        )}

        {/* Folders Display */}
        {currentFolders.length > 0 ? (
          <div className={folderBrowse.viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
            : 'space-y-2'
          }>
            {currentFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  folderBrowse.viewMode === 'grid'
                    ? 'p-4 rounded-lg border border-border/50 hover:border-border hover:shadow-md bg-card/30'
                    : 'flex items-center p-3 rounded-lg hover:bg-accent/50'
                }`}
              >
                {folderBrowse.viewMode === 'grid' ? (
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: folder.color || '#3B82F6' }}
                    >
                      <FolderIcon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-medium text-foreground truncate">{folder.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {folder.documentCount || 0} documents
                    </p>
                    <div className="flex items-center justify-center mt-2 space-x-2">
                      {folder.visibility === 'PRIVATE' ? (
                        <span className="text-xs">🔒</span>
                      ) : folder.visibility === 'ORGANIZATION' ? (
                        <span className="text-xs">🏢</span>
                      ) : (
                        <span className="text-xs">👥</span>
                      )}
                      {(folder.children && folder.children.length > 0) && (
                        <span className="text-xs text-muted-foreground">
                          +{folder.children.length}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center flex-1">
                    <div 
                      className="w-8 h-8 rounded-md flex items-center justify-center mr-3"
                      style={{ backgroundColor: folder.color || '#3B82F6' }}
                    >
                      <FolderIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{folder.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {folder.documentCount || 0} documents
                        {(folder.children && folder.children.length > 0) && ` • ${folder.children.length} subfolders`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {folder.visibility === 'PRIVATE' ? (
                        <span title="Private">🔒</span>
                      ) : folder.visibility === 'ORGANIZATION' ? (
                        <span title="Organization">🏢</span>
                      ) : (
                        <span title="Shared">👥</span>
                      )}
                      <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {folderBrowse.currentFolder ? 'No Subfolders' : 'No Folders Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {folderBrowse.currentFolder 
                ? 'This folder doesn\'t contain any subfolders. You can upload files directly here.'
                : 'Create your first folder to organize your documents.'
              }
            </p>
            {folderBrowse.currentFolder && (
              <button
                onClick={handleExitFolderBrowse}
                className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 transition-colors"
              >
                Start Uploading to This Folder
              </button>
            )}
          </div>
        )}
      </div>
    );
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

          {/* Show folder browser if active */}
          {folderBrowse.isActive ? (
            renderFolderBrowser()
          ) : (
            <>
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
                  <div className="space-y-2">
                    <select
                      value={selectedFolder || ''}
                      onChange={(e) => setSelectedFolder(e.target.value ? parseInt(e.target.value) : null)}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Root folder</option>
                      {renderFolderOptions()}
                    </select>
                    <button
                      onClick={handleShowFolders}
                      className="w-full inline-flex items-center justify-center rounded-lg text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 px-3 py-2 transition-colors"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Browse Folders
                    </button>
                  </div>
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

              {/* Selected Folder Display */}
              {selectedFolder && (
                <div className="mb-6 p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <FolderIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        📁 Uploading to: {folders.find(f => f.id === selectedFolder.toString())?.name || 'Selected Folder'}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Files will be organized in this folder
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className="ml-auto text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

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
            </>
          )}

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
                          ✓ Uploaded successfully • Processing: {fileItem.result.status}
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
