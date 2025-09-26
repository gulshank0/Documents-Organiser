'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/ui/Navigation';
import { Document } from '@/types';
import { formatDate, getStatusColor, getDepartmentColor, getFileTypeIcon } from '@/lib/utils';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  ShareIcon,
  StarIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  TagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'content' | 'metadata'>('details');

  useEffect(() => {
    if (params.id) {
      fetchDocument(params.id as string);
    }
  }, [params.id]);

  const fetchDocument = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching document with ID:', id);
      const response = await fetch(`/api/documents/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Document not found');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
      }
      
      const data = await response.json();
      console.log('Document data received:', data.filename);
      setDocument(data);
      
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document?.original_path) {
      // In a real app, this would trigger a download from the server
      console.log('Downloading document:', document.filename);
      // You could implement actual file download here
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document?.filename,
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {error || 'Document not found'}
              </h1>
              <p className="text-gray-600 mb-6">
                The document you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/documents" className="kmrl-button-primary px-4 py-2">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Documents
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Link
                href="/documents"
                className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Documents
              </Link>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleShare}
                  className="kmrl-button-secondary px-4 py-2"
                >
                  <ShareIcon className="w-4 h-4 mr-2" />
                  Share
                </button>
                <button
                  onClick={handleDownload}
                  className="kmrl-button-primary px-4 py-2"
                  disabled={!document.original_path}
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Download
                </button>
              </div>
            </div>
            
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div className="text-4xl mr-4">
                  {getFileTypeIcon(document.file_type)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {document.filename}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className={`status-badge ${getStatusColor(document.status || 'UNKNOWN')}`}>
                      {document.status || 'Unknown'}
                    </span>
                    <span className={`department-badge ${getDepartmentColor(document.department || 'UNKNOWN')}`}>
                      {document.department || 'Unknown'}
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {document.processed_at ? formatDate(document.processed_at.toString()) : 'Not processed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'details', label: 'Details', icon: EyeIcon },
                { id: 'content', label: 'Content', icon: DocumentArrowDownIcon },
                { id: 'metadata', label: 'Metadata', icon: TagIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="kmrl-card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Document Information
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Filename</dt>
                      <dd className="mt-1 text-sm text-gray-900 break-all">{document.filename}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">File Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{document.file_type?.toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">MIME Type</dt>
                      <dd className="mt-1 text-sm text-gray-900">{document.mime_type || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Channel</dt>
                      <dd className="mt-1 text-sm text-gray-900">{document.channel || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Uploaded By</dt>
                      <dd className="mt-1 text-sm text-gray-900 flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {document.uploaded_by || 'Unknown'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {document.uploaded_at ? formatDate(document.uploaded_at.toString()) : 'Unknown'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div>
                <div className="kmrl-card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Processing Status
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Status</span>
                        <span className={`status-badge ${getStatusColor(document.status || 'UNKNOWN')}`}>
                          {document.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                    
                    {document.processed_at && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Processed At</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {formatDate(document.processed_at.toString())}
                        </p>
                      </div>
                    )}
                    
                    {document.error_message && (
                      <div>
                        <span className="text-sm font-medium text-red-700">Error Message</span>
                        <p className="text-sm text-red-600 mt-1 p-2 bg-red-50 rounded">
                          {document.error_message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="kmrl-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Extracted Content
              </h3>
              {document.extracted_text ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                    {document.extracted_text}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DocumentArrowDownIcon className="w-12 h-12 mx-auto mb-2" />
                  <p>No content has been extracted from this document yet.</p>
                  {document.status === 'PENDING' && (
                    <p className="text-sm mt-1">Content will be available after processing.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="kmrl-card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Technical Metadata
              </h3>
              {document.meta_data ? (
                <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
                  {JSON.stringify(document.meta_data, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TagIcon className="w-12 h-12 mx-auto mb-2" />
                  <p>No metadata available for this document.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}