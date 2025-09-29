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

  useEffect(() => {
    if (isOpen && documentId) {
      fetchDocument(documentId);
    } else {
      setDocument(null);
      setError(null);
      setZoom(1);
    }
  }, [isOpen, documentId]);

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

  const renderFilePreview = () => {
    if (!document) return null;
    
    const fileType = document.fileType?.toLowerCase() || '';
    const fileUrl = `/api/documents/${document.id}/file`;

    // Enhanced iframe preview for most file types
    const renderIframePreview = (src: string, height = '600px', fallbackContent?: React.ReactNode) => (
      <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ minHeight: height }}>
        <iframe
          src={src}
          className="w-full h-full border-0 rounded-lg"
          style={{ minHeight: height }}
          title={document.filename}
          onLoad={() => setError(null)} // Clear error on successful load
          onError={() => {
            setError('Preview failed to load');
            if (fallbackContent) {
              return fallbackContent;
            }
          }}
          allow="fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
        
        {/* Loading overlay */}
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center animate-pulse pointer-events-none opacity-50">
          <div className="text-center">
            <div className="text-4xl mb-2">{getFileTypeIcon(document.fileType)}</div>
            <p className="text-sm text-gray-600">Loading preview...</p>
          </div>
        </div>
      </div>
    );

    // PDFs - Enhanced iframe with fallback
    if (fileType === 'pdf') {
      return renderIframePreview(
        fileUrl,
        '700px',
        <div className="p-6 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">PDF Preview</h3>
          <p className="text-gray-600 mb-4">Click below to download and view the PDF</p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Download PDF
          </button>
        </div>
      );
    }

    // Office documents - Enhanced Google Docs viewer
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(fileType)) {
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + fileUrl)}&embedded=true`;
      
      return renderIframePreview(
        googleViewerUrl,
        '650px',
        document.extractedText ? (
          <div className="p-6">
            <div className="text-6xl mb-4 text-center">{getFileTypeIcon(document.fileType)}</div>
            <h4 className="font-medium mb-4 text-center">Document Content Preview</h4>
            <div className="bg-white p-4 rounded-lg shadow-sm max-h-96 overflow-y-auto border">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {document.extractedText.substring(0, 2000)}
                {document.extractedText.length > 2000 && '...'}
              </p>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Download Full Document
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">{getFileTypeIcon(document.fileType)}</div>
            <h3 className="text-lg font-medium mb-2">Document Preview Unavailable</h3>
            <p className="text-gray-600 mb-4">This {fileType.toUpperCase()} file cannot be previewed online</p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Download {fileType.toUpperCase()}
            </button>
          </div>
        )
      );
    }

    // Text files - Enhanced iframe or content view
    if (['txt', 'md', 'json', 'xml', 'csv', 'html', 'css', 'js', 'ts'].includes(fileType)) {
      if (document.extractedText) {
        return (
          <div className="bg-gray-50 rounded-lg p-4" style={{ minHeight: '500px' }}>
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{document.filename}</span>
                <span className="text-xs text-gray-500">{fileType.toUpperCase()}</span>
              </div>
              <pre 
                className="p-4 text-sm font-mono overflow-auto bg-white"
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
      } else {
        return renderIframePreview(fileUrl, '500px');
      }
    }

    // Images - Enhanced display with zoom
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'].includes(fileType)) {
      return (
        <div className="flex justify-center items-center bg-gray-50 rounded-lg p-4" style={{ minHeight: '500px' }}>
          <div className="relative max-w-full max-h-full">
            <img
              src={fileUrl}
              alt={document.filename}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              style={{ 
                transform: `scale(${zoom})`,
                maxHeight: '70vh',
                transition: 'transform 0.2s ease-in-out'
              }}
              onError={() => setError('Failed to load image')}
              onLoad={() => setError(null)}
            />
          </div>
        </div>
      );
    }

    // Videos - Enhanced video player
    if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(fileType)) {
      return (
        <div className="flex justify-center items-center bg-gray-50 rounded-lg p-4" style={{ minHeight: '500px' }}>
          <video
            controls
            className="max-w-full max-h-full rounded-lg shadow-lg"
            style={{ maxHeight: '70vh' }}
            onError={() => setError('Failed to load video')}
            onLoadStart={() => setError(null)}
            poster={`${fileUrl}?thumbnail=true`} // Optional: if you have thumbnail generation
          >
            <source src={fileUrl} type={`video/${fileType}`} />
            <p className="text-gray-600">Your browser doesn't support video playback.</p>
          </video>
        </div>
      );
    }

    // Audio - Enhanced audio player
    if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'wma'].includes(fileType)) {
      return (
        <div className="flex flex-col justify-center items-center bg-gray-50 rounded-lg p-8 text-center" style={{ minHeight: '400px' }}>
          <div className="text-8xl mb-6">🎵</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">{document.filename}</h3>
          <p className="text-gray-600 mb-6">{fileType.toUpperCase()} Audio File</p>
          <div className="w-full max-w-md">
            <audio
              controls
              className="w-full rounded-lg shadow-sm"
              onError={() => setError('Failed to load audio')}
              onLoadStart={() => setError(null)}
            >
              <source src={fileUrl} type={`audio/${fileType}`} />
              <p className="text-gray-600">Your browser doesn't support audio playback.</p>
            </audio>
          </div>
        </div>
      );
    }

    // Archives and other files - Try iframe first, then fallback
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileType)) {
      return (
        <div className="flex flex-col justify-center items-center bg-gray-50 rounded-lg p-8 text-center" style={{ minHeight: '400px' }}>
          <div className="text-8xl mb-6">📦</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-800">{document.filename}</h3>
          <p className="text-gray-600 mb-6">Archive File ({fileType.toUpperCase()})</p>
          <p className="text-sm text-gray-500 mb-6 max-w-md">
            Archive files cannot be previewed online. Download to extract and view contents.
          </p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Download Archive
          </button>
        </div>
      );
    }

    // Universal iframe fallback for unknown types
    return (
      <div className="space-y-4">
        {/* Try iframe preview first */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            Attempting to preview {fileType.toUpperCase()} file. If preview doesn't work, download the file instead.
          </p>
        </div>
        
        {renderIframePreview(
          fileUrl,
          '500px',
          <div className="flex flex-col justify-center items-center p-8 text-center">
            <div className="text-8xl mb-4">{getFileTypeIcon(document.fileType)}</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">{document.filename}</h3>
            <p className="text-gray-600 mb-4">{fileType.toUpperCase()} File</p>
            
            {document.extractedText ? (
              <div className="mt-6 p-6 bg-white rounded-lg shadow-sm max-w-4xl w-full">
                <h4 className="font-medium mb-3 text-left">Extracted Content:</h4>
                <div className="text-left max-h-64 overflow-y-auto border rounded p-4 bg-gray-50">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {document.extractedText.substring(0, 1000)}
                    {document.extractedText.length > 1000 && '...'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-4">Preview not available for this file type</p>
            )}
            
            <button
              onClick={handleDownload}
              className="mt-4 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
              Download File
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto" 
      onKeyDown={handleKeyDown} 
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={handleBackdropClick}
          onKeyDown={(e) => e.key === 'Enter' && onClose()}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">
                {document ? getFileTypeIcon(document.fileType) : '📄'}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {loading ? 'Loading...' : document?.filename || 'Document Preview'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Zoom controls for images and text */}
              {document && (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'txt'].includes(document.fileType?.toLowerCase() || '')) && (
                <>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    title="Zoom out"
                  >
                    <MagnifyingGlassMinusIcon className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-500 min-w-[3rem] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                    title="Zoom in"
                  >
                    <MagnifyingGlassPlusIcon className="w-5 h-5" />
                  </button>
                </>
              )}
              
              {document && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                  Download
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading && (
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="flex flex-col justify-center items-center min-h-[400px] text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
                <p className="text-gray-500">Unable to load document preview</p>
              </div>
            )}

            {!loading && !error && renderFilePreview()}
          </div>
        </div>
      </div>
    </div>
  );
}