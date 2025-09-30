'use client';

import { useState, useEffect } from 'react';
import { Document } from '@/types';
import { getFileTypeIcon } from '@/lib/utils';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon
} from '@heroicons/react/24/outline';

interface DocumentPreviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly documentId: string | null;
}

export function DocumentPreviewModal({ isOpen, onClose, documentId }: DocumentPreviewModalProps) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocument(documentId);
    } else {
      resetState();
    }
  }, [isOpen, documentId]);

  const resetState = () => {
    setDocument(null);
    setError(null);
    setZoom(1);
    setImageLoaded(false);
    setFileUrl(null);
  };

  const fetchDocument = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
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
      const documentData = data.success ? data.data : data;
      setDocument(documentData);
      
      // Set the file URL for preview
      setFileUrl(`/api/documents/${id}/file`);
      
    } catch (error) {
      console.error('Error fetching document:', error);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (document) {
      window.open(`/api/documents/${document.id}/download`, '_blank');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const renderFilePreview = () => {
    if (!document || !fileUrl) return null;
    
    const fileType = document.fileType?.toLowerCase() || '';

    // Images - Direct display with zoom
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType)) {
      return (
        <div className="flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[500px] overflow-auto">
          <div className="relative">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
            <img
              src={fileUrl}
              alt={document.filename}
              className="max-w-full h-auto object-contain rounded-lg shadow-lg transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom})`,
                maxHeight: '70vh',
                display: imageLoaded ? 'block' : 'none'
              }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setError('Failed to load image')}
            />
          </div>
        </div>
      );
    }

    // PDFs - Use browser's native PDF viewer
    if (fileType === 'pdf') {
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '700px' }}>
          <iframe
            src={fileUrl}
            className="w-full border-0 rounded-lg"
            style={{ height: '700px' }}
            title={document.filename}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // Videos - Native HTML5 video player
    if (['mp4', 'webm', 'ogg', 'mov'].includes(fileType)) {
      return (
        <div className="flex justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-6 min-h-[500px]">
          <video
            controls
            className="max-w-full rounded-lg shadow-lg"
            style={{ maxHeight: '70vh' }}
            onError={() => setError('Failed to load video')}
            aria-label={`Video player for ${document.filename}`}
          >
            <source src={fileUrl} type={`video/${fileType}`} />
            <track kind="captions" />
            Your browser doesn&apos;t support video playback.
          </video>
        </div>
      );
    }

    // Audio - Native HTML5 audio player
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fileType)) {
      return (
        <div className="flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 rounded-lg p-8 min-h-[400px]">
          <div className="text-8xl mb-6">🎵</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">{document.filename}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{fileType.toUpperCase()} Audio File</p>
          <div className="w-full max-w-md">
            <audio
              controls
              className="w-full rounded-lg shadow-sm"
              onError={() => setError('Failed to load audio')}
              aria-label={`Audio player for ${document.filename}`}
            >
              <source src={fileUrl} type={`audio/${fileType}`} />
              <track kind="captions" />
              Your browser doesn&apos;t support audio playback.
            </audio>
          </div>
        </div>
      );
    }

    // Office documents - Use Google Docs Viewer
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType)) {
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      
      return (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '650px' }}>
          <iframe
            src={googleViewerUrl}
            className="w-full border-0 rounded-lg"
            style={{ height: '650px' }}
            title={document.filename}
            onError={() => {
              // Fallback to extracted text if available
              if (document.extractedText) {
                return renderExtractedText();
              }
              setError('Failed to load document preview');
            }}
          />
        </div>
      );
    }

    // Text files - Display with syntax highlighting
    if (['txt', 'md', 'json', 'xml', 'csv', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp'].includes(fileType)) {
      if (document.extractedText) {
        return renderExtractedText();
      } else {
        // Fetch and display the text content
        return (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '500px' }}>
            <iframe
              src={fileUrl}
              className="w-full border-0 rounded-lg bg-white dark:bg-gray-800"
              style={{ height: '600px' }}
              title={document.filename}
            />
          </div>
        );
      }
    }

    // Default - Show extracted text if available, otherwise provide download option
    if (document.extractedText) {
      return renderExtractedText();
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col justify-center items-center p-8 min-h-[400px] text-center">
        <div className="text-8xl mb-6">{getFileTypeIcon(document.fileType)}</div>
        <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">{document.filename}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{fileType.toUpperCase()} File</p>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          Preview is not available for this file type. Please download to view.
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
          Download File
        </button>
      </div>
    );
  };

  const renderExtractedText = () => {
    if (!document?.extractedText) return null;

    return (
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4" style={{ minHeight: '500px' }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{document.filename}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{document.fileType?.toUpperCase()}</span>
            </div>
            <button
              onClick={handleDownload}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Download Original
            </button>
          </div>
          <pre 
            className="p-6 text-sm font-mono overflow-auto bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
            style={{ 
              fontSize: `${zoom * 0.875}rem`,
              minHeight: '400px',
              maxHeight: '600px'
            }}
          >
            {document.extractedText}
          </pre>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const canZoom = document && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'txt', 'md', 'json', 'xml'].includes(document.fileType?.toLowerCase() || '');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Background overlay */}
        <button
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity cursor-default"
          onClick={handleBackdropClick}
          onKeyDown={(e) => e.key === 'Enter' && onClose()}
          aria-label="Close modal"
          tabIndex={0}
        />

        {/* Modal */}
        <div 
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col"
          role="dialog"
          aria-modal="true"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center min-w-0 flex-1">
              <div className="text-2xl mr-3 flex-shrink-0">
                {document ? getFileTypeIcon(document.fileType) : '📄'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {loading ? 'Loading...' : document?.filename || 'Document Preview'}
                </h2>
                {document && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {document.fileType?.toUpperCase()} • {document.status}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
              {/* Zoom controls */}
              {canZoom && !loading && !error && (
                <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Zoom out"
                    disabled={zoom <= 0.5}
                  >
                    <MagnifyingGlassMinusIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium min-w-[3rem] text-center"
                    title="Reset zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Zoom in"
                    disabled={zoom >= 3}
                  >
                    <MagnifyingGlassPlusIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {/* Download button */}
              {document && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                  Download
                </button>
              )}
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading && (
              <div className="flex flex-col justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col justify-center items-center min-h-[400px] text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{error}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Unable to load document preview</p>
                {document && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    Download Instead
                  </button>
                )}
              </div>
            )}

            {!loading && !error && renderFilePreview()}
          </div>
        </div>
      </div>
    </div>
  );
}