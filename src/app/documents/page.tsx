'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navigation } from '@/components/ui/Navigation';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { FolderManager } from '@/components/ui/FolderManager';
import { DocumentFolderActions } from '@/components/ui/DocumentFolderActions';
import { QuickFolderCreator } from '@/components/ui/QuickFolderCreator';
import { FolderCreationModal } from '@/components/ui/FolderCreationModal';
import { Document } from '@/types';
import { getStatusColor, getFileTypeIcon } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  FolderIcon,
  ArrowsRightLeftIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CheckIcon,
  PlusIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface FolderInfo {
  id: string;
  name: string;
  color?: string;
  documentCount?: number;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filters, setFilters] = useState({
    folderId: null as string | null,
    status: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showFolderPanel, setShowFolderPanel] = useState(true);
  const [showAdvancedFolderModal, setShowAdvancedFolderModal] = useState(false);
  
  // Folder management state
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [currentFolderInfo, setCurrentFolderInfo] = useState<FolderInfo | null>(null);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<FolderInfo[]>([]);

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    // If authenticated, fetch documents and folders
    if (status === 'authenticated') {
      fetchDocuments();
      fetchFolders();
    }
  }, [status, currentPage, filters, retryCount, router]);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        const flatFolders = flattenFolders(result.data || []);
        setFolders(flatFolders);
        
        // Update current folder info and breadcrumb
        if (filters.folderId) {
          const folder = flatFolders.find(f => f.id === filters.folderId);
          setCurrentFolderInfo(folder || null);
          updateBreadcrumb(folder, flatFolders);
        } else {
          setCurrentFolderInfo(null);
          setFolderBreadcrumb([]);
        }
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const flattenFolders = (folderTree: any[]): FolderInfo[] => {
    const flattened: FolderInfo[] = [];
    
    const traverse = (folders: any[]) => {
      folders.forEach(folder => {
        flattened.push({
          id: folder.id,
          name: folder.name,
          color: folder.color,
          documentCount: folder.documentCount
        });
        if (folder.children && folder.children.length > 0) {
          traverse(folder.children);
        }
      });
    };
    
    traverse(folderTree);
    return flattened;
  };

  const updateBreadcrumb = (folder: FolderInfo | undefined, allFolders: FolderInfo[]) => {
    if (!folder) {
      setFolderBreadcrumb([]);
      return;
    }
    
    // For now, just show the current folder. 
    // In a more complex implementation, you'd traverse up the parent chain
    setFolderBreadcrumb([folder]);
  };

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * 20).toString(),
        limit: '20'
      });

      if (filters.folderId) params.append('folderId', filters.folderId);
      if (filters.status) params.append('status', filters.status);

      console.log('Fetching documents with params:', params.toString());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`/api/documents?${params}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const apiResponse = await response.json();
      
      // Check if the API response has the expected structure
      if (apiResponse.success && Array.isArray(apiResponse.data)) {
        // Filter by search query on client side for simplicity
        let filteredDocs = apiResponse.data;
        if (filters.search) {
          filteredDocs = apiResponse.data.filter((doc: Document) =>
            doc.filename.toLowerCase().includes(filters.search.toLowerCase()) ||
            doc.extractedText?.toLowerCase().includes(filters.search.toLowerCase())
          );
        }
        
        setDocuments(filteredDocs);
        setTotalPages(Math.ceil(filteredDocs.length / 20));
        setRetryCount(0); // Reset retry count on success
      } else {
        handleApiError(apiResponse);
      }
      
    } catch (error) {
      handleFetchError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (apiResponse: any) => {
    const errorMessage = apiResponse.error || 'Failed to load documents';
    
    if (errorMessage.includes('Database connection')) {
      setError('Database connection issue. Retrying...');
      // Auto-retry for database connection issues
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        setError('Unable to connect to the database. Please check your connection and try again.');
      }
    } else {
      setError(errorMessage);
    }
    
    setDocuments([]);
    setTotalPages(1);
  };

  const handleFetchError = (error: unknown) => {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (error.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('Database connection')) {
        setError('Database connection issue. The system is attempting to reconnect...');
        // Auto-retry for database connection issues
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000 * (retryCount + 1));
        }
      } else {
        setError(error.message);
      }
    } else {
      setError('An unexpected error occurred. Please try again.');
    }
    
    setDocuments([]);
    setTotalPages(1);
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchDocuments();
  };

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setSelectedDocuments(new Set()); // Clear selections when filters change
  };

  const handleFolderSelect = (folderId: string | null) => {
    handleFilterChange('folderId', folderId);
  };

  const handlePreviewClick = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setSelectedDocumentId(null);
  };

  const handleDocumentSelect = (documentId: string, selected: boolean) => {
    const newSelected = new Set(selectedDocuments);
    if (selected) {
      newSelected.add(documentId);
    } else {
      newSelected.delete(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleMoveDocuments = () => {
    if (selectedDocuments.size === 0) return;
    setShowMoveModal(true);
  };

  const handleMoveComplete = async (folderId: string | null) => {
    setShowMoveModal(false);
    setSelectedDocuments(new Set());
    await fetchDocuments(); // Refresh the list
    await fetchFolders(); // Refresh folder counts
  };

  const handleFolderCreated = async (folder: any) => {
    // Refresh folder list
    await fetchFolders();
    console.log('New folder created:', folder);
  };

  const getCurrentFolderName = () => {
    if (!filters.folderId) return 'All Documents';
    return currentFolderInfo?.name || 'Selected Folder';
  };

  const getFolderForDocument = (doc: Document) => {
    if (!doc.folderId) return null;
    return folders.find(f => f.id === doc.folderId);
  };

  // Show loading screen while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-primary/40 animate-pulse mx-auto"></div>
          </div>
          <p className="text-muted-foreground text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, the useEffect will redirect, but show loading in the meantime
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
          </div>
          <p className="text-muted-foreground text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      
      {/* Enhanced Folder sidebar */}
      {showFolderPanel && (
        <div className="w-80 border-r border-border bg-card/50 pt-16">
          <div className="p-4 max-h-screen overflow-y-auto">
            {/* Quick Folder Creator at the top */}
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">Quick Create</h3>
                <button
                  onClick={() => setShowAdvancedFolderModal(true)}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                  title="Advanced folder options"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              </div>
              
              <QuickFolderCreator 
                showInline={true}
                onFolderCreated={handleFolderCreated}
                placeholder="Quick folder name..."
                className="w-full"
              />
              
              <div className="text-xs text-muted-foreground text-center">
                Or <button 
                  onClick={() => setShowAdvancedFolderModal(true)}
                  className="text-primary hover:underline"
                >
                  create with advanced options
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <FolderManager
                selectedFolderId={filters.folderId}
                onFolderSelect={handleFolderSelect}
                onFolderCreate={handleFolderCreated}
              />
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 pt-16 ${showFolderPanel ? '' : 'ml-0'}`}>
        <div className="max-w-7xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
          {/* Enhanced Header with Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-3xl font-bold text-foreground">Documents</h1>
                  {currentFolderInfo && (
                    <div className="flex items-center text-muted-foreground">
                      <ChevronRightIcon className="w-5 h-5 mx-2" />
                      <div 
                        className="flex items-center px-2 py-1 rounded-md text-sm"
                        style={{ backgroundColor: `${currentFolderInfo.color}15`, color: currentFolderInfo.color }}
                      >
                        <FolderIcon className="w-4 h-4 mr-1" />
                        {currentFolderInfo.name}
                        <span className="ml-2 text-xs">({currentFolderInfo.documentCount || 0})</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Breadcrumb Navigation */}
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <button
                    onClick={() => handleFolderSelect(null)}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    <HomeIcon className="w-4 h-4 mr-1" />
                    All Documents
                  </button>
                  {folderBreadcrumb.map((folder, index) => (
                    <div key={folder.id} className="flex items-center">
                      <ChevronRightIcon className="w-4 h-4 mx-1" />
                      <button
                        onClick={() => handleFolderSelect(folder.id)}
                        className="hover:text-foreground transition-colors flex items-center"
                        style={{ color: folder.color }}
                      >
                        <FolderIcon className="w-4 h-4 mr-1" />
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>
                
                <p className="text-muted-foreground mt-2">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} in {getCurrentFolderName()}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Quick folder creation button when panel is hidden */}
                {!showFolderPanel && (
                  <QuickFolderCreator 
                    compact={true}
                    onFolderCreated={handleFolderCreated}
                  />
                )}
                
                <button
                  onClick={() => setShowFolderPanel(!showFolderPanel)}
                  className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-4 py-2 transition-all duration-200"
                >
                  <FolderIcon className="w-4 h-4 mr-2" />
                  {showFolderPanel ? 'Hide Folders' : 'Show Folders'}
                </button>
                
                <div className="flex rounded-lg border border-input bg-background">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-l-lg transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-r-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Squares2X2Icon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Filters and Actions */}
          <div className="glass-card p-6 mb-6 bg-card/50 border border-border/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
              >
                <option value="">All Statuses</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>

              {/* Selected Actions */}
              <div className="flex gap-2">
                {selectedDocuments.size > 0 && (
                  <button 
                    onClick={handleMoveDocuments}
                    className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 border px-4 py-2 transition-all duration-200"
                  >
                    <ArrowsRightLeftIcon className="w-4 h-4 mr-2" />
                    Move ({selectedDocuments.size})
                  </button>
                )}
                
                {/* Quick create folder button */}
                <QuickFolderCreator 
                  compact={true}
                  onFolderCreated={handleFolderCreated}
                />
                
                <button className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-4 py-2 transition-all duration-200">
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  More Filters
                </button>
              </div>

              {/* Upload Button */}
              <div className="flex justify-end">
                <Link href="/upload" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-4 py-2 transition-all duration-200">
                  Upload New
                </Link>
              </div>
            </div>
          </div>

          {/* Documents Display */}
          <div className="glass-card bg-card/50 border border-border/50">
            {loading ? (
              <div className="p-6 animate-pulse">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={`loading-grid-${i}`} className="h-48 bg-muted rounded-lg"></div>
                    ))}
                  </div>
                ) : (
                  [...Array(5)].map((_, i) => (
                    <div key={`loading-list-${i}`} className="h-16 bg-muted rounded mb-4"></div>
                  ))
                )}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <DocumentArrowDownIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-6">
                  {(() => {
                    const hasActiveFilters = filters.search || filters.status || filters.folderId;
                    return hasActiveFilters 
                      ? 'Try adjusting your filters or search terms'
                      : 'Get started by uploading your first document or creating a folder';
                  })()}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/upload" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-4 py-2 transition-all duration-200">
                    Upload Document
                  </Link>
                  <QuickFolderCreator 
                    onFolderCreated={handleFolderCreated}
                  />
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {documents.map((doc) => {
                    const docFolder = getFolderForDocument(doc);
                    return (
                      <div
                        key={doc.id}
                        className="group relative bg-card border border-border/50 rounded-xl p-4 hover:border-border hover:shadow-lg transition-all duration-200 hover:scale-105"
                      >
                        {/* Selection Checkbox */}
                        <div className="absolute top-3 left-3 z-10">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.has(doc.id)}
                            onChange={(e) => handleDocumentSelect(doc.id, e.target.checked)}
                            className="rounded border-input bg-background/80 backdrop-blur-sm"
                          />
                        </div>

                        {/* Document Icon and Preview */}
                        <div className="text-center mb-4">
                          <div className="text-6xl mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                            {getFileTypeIcon(doc.fileType)}
                          </div>
                          <button
                            onClick={() => handlePreviewClick(doc.id)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <EyeIcon className="w-3 h-3 mr-1" />
                            Preview
                          </button>
                        </div>

                        {/* Document Info */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-medium text-foreground text-sm truncate" title={doc.filename}>
                              {doc.filename}
                            </h3>
                            <p className="text-xs text-muted-foreground uppercase">
                              {doc.fileType || 'Unknown'}
                            </p>
                          </div>

                          {/* Status Badge */}
                          <div className="flex justify-center">
                            <span className={`status-badge text-xs ${getStatusColor(doc.status || 'UNKNOWN')}`}>
                              {doc.status || 'Unknown'}
                            </span>
                          </div>

                          {/* Folder */}
                          {docFolder ? (
                            <div className="flex items-center justify-center">
                              <div 
                                className="w-2 h-2 rounded-full mr-2"
                                style={{ backgroundColor: docFolder.color || '#3B82F6' }}
                              ></div>
                              <button
                                onClick={() => handleFolderSelect(docFolder.id)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
                                title={docFolder.name}
                              >
                                {docFolder.name}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center text-xs text-muted-foreground">
                              <FolderIcon className="w-3 h-3 mr-1 opacity-50" />
                              <span>No Folder</span>
                            </div>
                          )}

                          {/* Channel */}
                          <div className="text-center">
                            <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                              {doc.channel}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-center space-x-2">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="text-primary hover:text-primary/80 flex items-center transition-colors text-xs"
                            >
                              <EyeIcon className="w-3 h-3 mr-1" />
                              View
                            </Link>
                            {doc.status === 'COMPLETED' && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <button className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors text-xs">
                                  Summary
                                </button>
                                <span className="text-muted-foreground">•</span>
                                <button className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors text-xs">
                                  Compliance
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination for Grid View */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/50">
                    <div className="text-sm text-muted-foreground">
                      Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-3 py-2 disabled:opacity-50 transition-all duration-200"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-3 py-2 disabled:opacity-50 transition-all duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* List View */
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.size === documents.length && documents.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-input"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Folder
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Preview
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border/50">
                      {documents.map((doc) => {
                        const docFolder = getFolderForDocument(doc);
                        return (
                          <tr key={doc.id} className="hover:bg-accent/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedDocuments.has(doc.id)}
                                onChange={(e) => handleDocumentSelect(doc.id, e.target.checked)}
                                className="rounded border-input"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-2xl mr-3">
                                  {getFileTypeIcon(doc.fileType)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground max-w-xs truncate">
                                    {doc.filename}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {doc.fileType?.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {docFolder ? (
                                <div className="flex items-center">
                                  <div 
                                    className="w-3 h-3 rounded-sm mr-2"
                                    style={{ backgroundColor: docFolder.color || '#3B82F6' }}
                                  ></div>
                                  <button
                                    onClick={() => handleFolderSelect(docFolder.id)}
                                    className="text-sm text-foreground hover:text-primary transition-colors hover:underline max-w-32 truncate"
                                    title={docFolder.name}
                                  >
                                    {docFolder.name}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <FolderIcon className="w-4 h-4 mr-1 opacity-50" />
                                  <span>No Folder</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`status-badge ${getStatusColor(doc.status || 'UNKNOWN')}`}>
                                {doc.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {doc.channel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => handlePreviewClick(doc.id)}
                                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <EyeIcon className="w-4 h-4 mr-1" />
                                Preview
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-3">
                                <Link
                                  href={`/documents/${doc.id}`}
                                  className="text-primary hover:text-primary/80 flex items-center transition-colors"
                                >
                                  <EyeIcon className="w-4 h-4 mr-1" />
                                  View
                                </Link>
                                {doc.status === 'COMPLETED' && (
                                  <>
                                    <button className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors">
                                      Summary
                                    </button>
                                    <button className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors">
                                      Compliance
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for List View */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 px-6 border-t border-border/50">
                    <div className="text-sm text-muted-foreground">
                      Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-3 py-2 disabled:opacity-50 transition-all duration-200"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-3 py-2 disabled:opacity-50 transition-all duration-200"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        documentId={selectedDocumentId}
      />

      {/* Move Documents Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <DocumentFolderActions
              documentIds={Array.from(selectedDocuments)}
              currentFolderId={filters.folderId}
              onMoveComplete={handleMoveComplete}
              onCancel={() => setShowMoveModal(false)}
            />
          </div>
        </div>
      )}

      {/* Advanced Folder Creation Modal */}
      <FolderCreationModal
        isOpen={showAdvancedFolderModal}
        onClose={() => setShowAdvancedFolderModal(false)}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
}