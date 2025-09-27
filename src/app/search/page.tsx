'use client';

import { useState } from 'react';
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
    use_semantic: true
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
        body: JSON.stringify({ query, ...filters })
      });
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 pt-16">
        <div className="max-w-4xl mx-auto pt-16 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Search Documents</h1>
            <p className="text-muted-foreground mt-2">
              Use AI-powered semantic search to find relevant documents
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
                  placeholder="Search for documents, keywords, or content..."
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
                    <span className="ml-2 text-sm text-foreground">Use semantic search</span>
                  </label>
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
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Department
                      </label>
                      <select
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All Departments</option>
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        File Type
                      </label>
                      <select
                        value={filters.file_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, file_type: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All Types</option>
                        <option value="pdf">PDF</option>
                        <option value="docx">Word Document</option>
                        <option value="txt">Text File</option>
                        <option value="jpg">Image</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Source Channel
                      </label>
                      <select
                        value={filters.channel}
                        onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
                        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All Channels</option>
                        <option value="EMAIL">Email</option>
                        <option value="WEB_UPLOAD">Web Upload</option>
                        <option value="FILE_WATCHER">File Watcher</option>
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
                  Found {results.total_documents} documents matching "{results.query}"
                  {filters.use_semantic && <span className="text-primary"> (semantic search)</span>}
                </p>
              </div>

              {results.total_documents === 0 ? (
                <div className="text-center py-12">
                  <DocumentMagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms or filters
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.results.map((result) => (
                    <div key={result.id} className="border border-border/50 rounded-lg p-6 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start flex-1">
                          <div className="text-2xl mr-4 mt-1">
                            {getFileTypeIcon(result.filename.split('.').pop() || '')}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              {result.filename}
                            </h3>
                            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                              {result.text_preview}
                            </p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className={`department-badge ${getDepartmentColor(result.department)}`}>
                                {result.department}
                              </span>
                              <span className="text-muted-foreground">
                                {formatDate(result.processed_at)}
                              </span>
                              {result.relevance_score > 0 && (
                                <span className="text-primary">
                                  Relevance: {(result.relevance_score * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button className="ml-4 text-primary hover:text-primary/80 font-medium transition-colors">
                          View Document
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Method Info */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Search method: {results.search_method} • 
                  Results processed in real-time
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}