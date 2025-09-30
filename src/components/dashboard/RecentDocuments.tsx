'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, getStatusColor, getDepartmentColor, getFileTypeIcon } from '@/lib/utils';
import { ExclamationTriangleIcon, EyeIcon, DocumentTextIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  channel: string;
  department: string;
  status: string;
  processed_at: string;
}

export default function RecentDocuments() {
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentDocuments() {
      try {
        const response = await fetch('/api/dashboard-data');
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        
        const data = await response.json();
        setRecentDocuments(data.documents || []);
      } catch (err) {
        console.error('Error fetching recent documents:', err);
        setError('Unable to load recent documents');
      } finally {
        setLoading(false);
      }
    }

    fetchRecentDocuments();
  }, []);

  if (loading) {
    return (
      <Card className="w-full bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border-0 shadow-lg">
        <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <div className="h-5 sm:h-6 w-32 sm:w-40 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg animate-pulse"></div>
              <div className="h-3 sm:h-4 w-40 sm:w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 animate-pulse">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 dark:bg-slate-700 rounded-xl flex-shrink-0"></div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-3 sm:h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-2 sm:h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 sm:w-20 h-6 sm:h-8 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-gradient-to-br from-red-50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200/50 dark:border-red-800/50">
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="text-center py-6 sm:py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <ExclamationTriangleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mx-auto mb-3 sm:mb-4" />
            </motion.div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{error}</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Check your connection and try again</p>
            <Button 
              variant="outline" 
              className="mt-3 sm:mt-4 text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-0.5 sm:space-y-1">
            <CardTitle className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Recent Documents
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              Latest document activity and processing status
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="group hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors w-fit h-8 sm:h-9"
          >
            <Link href="/documents" className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium">View all</span>
              <ArrowRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 p-4 sm:p-6">
        {recentDocuments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 sm:py-12"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
              <DocumentTextIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No documents yet</h4>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 max-w-sm mx-auto px-4">
              Upload your first document to get started with document processing
            </p>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs sm:text-sm h-8 sm:h-10">
              <Link href="/upload">
                Upload Document
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <AnimatePresence>
              {recentDocuments.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div className="relative p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-slate-800/50 dark:via-slate-700/20 dark:to-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-200 dark:hover:border-blue-700/50 hover:shadow-md transition-all duration-300 cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-purple-50/0 to-blue-50/0 group-hover:from-blue-50/20 group-hover:via-purple-50/10 group-hover:to-blue-50/20 dark:group-hover:from-blue-950/10 dark:group-hover:via-purple-950/5 dark:group-hover:to-blue-950/10 rounded-lg sm:rounded-xl transition-all duration-300"></div>
                    
                    <div className="relative flex items-center gap-2 sm:gap-4">
                      {/* File Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-sm group-hover:shadow-md transition-shadow">
                          {getFileTypeIcon(doc.file_type)}
                        </div>
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate text-xs sm:text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {doc.filename}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
                              via {doc.channel} • {formatDate(doc.processed_at)}
                            </p>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                              <Badge 
                                variant="secondary" 
                                className={`${getDepartmentColor(doc.department)} text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border-0`}
                              >
                                {doc.department}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`${getStatusColor(doc.status)} text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border`}
                              >
                                {doc.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-7 sm:h-8 px-2 sm:px-3 text-xs hover:bg-blue-50 dark:hover:bg-blue-950/20"
                            >
                              <Link href={`/documents/${doc.id}`} className="flex items-center gap-1">
                                <EyeIcon className="w-3 h-3" />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                            </Button>
                            {doc.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 sm:h-8 px-2 sm:px-3 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 hidden sm:flex"
                              >
                                <DocumentTextIcon className="w-3 h-3 mr-1" />
                                Summary
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Show more button */}
            {recentDocuments.length >= 5 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="pt-3 sm:pt-4 text-center border-t border-slate-200/50 dark:border-slate-700/50"
              >
                <Button
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Link href="/documents">
                    View all {recentDocuments.length}+ documents
                  </Link>
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}