'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/ui/Navigation';
import { SearchResponse, DEPARTMENTS } from '@/types';
import { formatDate, getDepartmentColor, getFileTypeIcon } from '@/lib/utils';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  DocumentMagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    file_type: '',
    channel: '',
    use_semantic: true // Default to semantic search
  });
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          department: filters.department || undefined,
          fileType: filters.file_type || undefined,
          channel: filters.channel || undefined,
          useSemanticSearch: filters.use_semantic,
          limit: 20
        })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📋';
      case 'txt': return '📃';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      default: return '📎';
    }
  };

  const getDepartmentColor = (department?: string) => {
    const colors: Record<string, string> = {
      'ACADEMIC': 'bg-blue-100 text-blue-800',
      'ENGINEERING': 'bg-purple-100 text-purple-800',
      'HR': 'bg-green-100 text-green-800',
      'FINANCE': 'bg-yellow-100 text-yellow-800',
      'MARKETING': 'bg-pink-100 text-pink-800',
      'GENERAL': 'bg-gray-100 text-gray-800'
    };
    return colors[department || 'GENERAL'] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 pt-16">
        <div className="max-w-4xl mx-auto pt-16 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Search Your Documents</h1>
            <p className="text-muted-foreground mt-2">
              Use AI-powered semantic search to find your personal documents using natural language
            </p>
          </div>

          {/* Search Form */}
          <div className="glass-card p-6 mb-8 bg-card/50 border border-border/50">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Main Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your documents with natural language (e.g., 'financial reports from last quarter')"
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 pl-12 text-lg h-12 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                />
              </div>

              {/* Search Options */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.use_semantic}
                      onChange={(e) => setFilters(prev => ({ ...prev, use_semantic: e.target.checked }))}
                      className="rounded border-input text-primary focus:ring-primary bg-background"
                    />
                    <span className="ml-2 text-sm text-foreground font-medium">
                      🧠 Semantic Search
                    </span>
                  </label>
                  
                  <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                    {filters.use_semantic ? 'AI-powered understanding' : 'Keyword matching'}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                    Advanced Filters
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-6 py-2 disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Advanced Filters */}
              {showAdvanced && (
                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-sm font-medium text-foreground mb-4">Advanced Filters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Department Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Department
                      </label>
                      <select
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All Departments</option>
                        <option value="ACADEMIC">Academic</option>
                        <option value="ENGINEERING">Engineering</option>
                        <option value="HR">Human Resources</option>
                        <option value="FINANCE">Finance</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="GENERAL">General</option>
                      </select>
                    </div>

                    {/* File Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        File Type
                      </label>
                      <select
                        value={filters.file_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, file_type: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All File Types</option>
                        <option value="pdf">PDF Documents</option>
                        <option value="doc">Word Documents</option>
                        <option value="xls">Excel Spreadsheets</option>
                        <option value="ppt">PowerPoint Presentations</option>
                        <option value="txt">Text Files</option>
                        <option value="jpg">Images</option>
                      </select>
                    </div>

                    {/* Channel Filter */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Upload Source
                      </label>
                      <select
                        value={filters.channel}
                        onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All Sources</option>
                        <option value="WEB_UPLOAD">Web Upload</option>
                        <option value="EMAIL">Email</option>
                        <option value="GOOGLE_DRIVE">Google Drive</option>
                        <option value="DROPBOX">Dropbox</option>
                        <option value="SHAREPOINT">SharePoint</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Search Results */}
          {loading && (
            <div className="glass-card p-6 bg-card/50 border border-border/50">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          )}

          {results && !loading && (
            <div className="glass-card p-6 bg-card/50 border border-border/50">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-foreground">
                  Search Results
                </h2>
                <p className="text-muted-foreground mt-1">
                  Found {results.data?.totalDocuments || 0} of your documents matching "{results.data?.query}"
                  {filters.use_semantic && <span className="text-primary ml-1">(semantic search)</span>}
                </p>
              </div>

              {(results.data?.totalDocuments || 0) === 0 ? (
                <div className="text-center py-12">
                  <DocumentMagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search terms or filters
                  </p>
                  {filters.use_semantic && (
                    <div className="text-sm text-muted-foreground">
                      💡 Semantic search understands context - try queries like:
                      <ul className="mt-2 space-y-1">
                        <li>"documents about financial planning"</li>
                        <li>"presentations from last month"</li>
                        <li>"contracts and legal documents"</li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {results.data?.results?.map((result) => (
                    <div key={result.id} className="border border-border/50 rounded-lg p-6 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <div className="text-2xl mr-4 mt-1">
                            {getFileTypeIcon(result.fileType)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              {result.filename}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {result.textPreview}
                            </p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(result.department)}`}>
                                {result.department || 'General'}
                              </span>
                              <span className="text-muted-foreground">
                                {result.processedAt ? formatDate(result.processedAt) : 'Not processed'}
                              </span>
                              {result.relevanceScore > 0 && (
                                <span className="text-primary font-medium">
                                  {filters.use_semantic ? '🎯' : '📝'} {(result.relevanceScore * 100).toFixed(1)}% match
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Link 
                          href={`/documents/${result.id}`}
                          className="ml-4 text-primary hover:text-primary/80 font-medium transition-colors px-3 py-1 rounded border border-primary/20 hover:bg-primary/10"
                        >
                          View Document
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Method Info */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    Search method: <span className="font-medium">{results.data?.searchMethod}</span> • 
                    Processed in {results.data?.processingTime}ms
                  </div>
                  <div>
                    Searching only your personal documents
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