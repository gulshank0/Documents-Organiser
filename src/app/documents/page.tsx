'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Navigation } from '@/components/ui/Navigation';
import { Document, DEPARTMENTS } from '@/types';
import { formatDate, getStatusColor, getDepartmentColor, getFileTypeIcon } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function DocumentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Check authentication status
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    // If authenticated, fetch documents
    if (status === 'authenticated') {
      fetchDocuments();
    }
  }, [status, currentPage, filters, retryCount]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * 20).toString(),
        limit: '20',
        ...(filters.department && { department: filters.department }),
        ...(filters.status && { status: filters.status })
      });

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
      
      console.log('Documents API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const apiResponse = await response.json();
      console.log('Documents API response data:', apiResponse);
      
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
        
        console.log('Setting documents:', filteredDocs.length, 'documents found');
        setDocuments(filteredDocs);
        setTotalPages(Math.ceil(filteredDocs.length / 20));
        setRetryCount(0); // Reset retry count on success
      } else {
        // Handle API error response or unexpected structure
        console.error('API returned unexpected structure:', apiResponse);
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
      }
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      
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
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchDocuments();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
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
      <main className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground mt-2">
              Browse and manage all processed documents
            </p>
          </div>

          {/* Filters */}
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

              {/* Department Filter */}
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

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

              {/* Actions */}
              <div className="flex gap-2">
                <button className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-4 py-2 transition-all duration-200">
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  More Filters
                </button>
                <Link href="/upload" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-4 py-2 transition-all duration-200">
                  Upload New
                </Link>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <span className="text-destructive text-sm">!</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-destructive">Connection Issue</h3>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    {retryCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Retry attempt {retryCount} of 3...
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleRetry}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-2 disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {/* Documents Table */}
          <div className="glass-card bg-card/50 border border-border/50">
            {loading ? (
              <div className="p-6 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded mb-4"></div>
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <DocumentArrowDownIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                <p className="text-muted-foreground mb-6">
                  {(() => {
                    const hasActiveFilters = Object.values(filters).some(f => f);
                    return hasActiveFilters 
                      ? 'Try adjusting your filters or search terms'
                      : 'Get started by uploading your first document';
                  })()}
                </p>
                <Link href="/upload" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-4 py-2 transition-all duration-200">
                  Upload Document
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Document
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Processed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border/50">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-accent/50 transition-colors">
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
                            <span className={`department-badge ${getDepartmentColor(doc.department || 'UNKNOWN')}`}>
                              {doc.department || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`status-badge ${getStatusColor(doc.status || 'UNKNOWN')}`}>
                              {doc.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {doc.channel}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {doc.processedAt ? formatDate(doc.processedAt.toString()) : 'Not processed'}
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
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
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
    </div>
  );
}