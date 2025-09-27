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

    // Images - direct display
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType)) {
      return (
        <div className="flex justify-center items-center min-h-[500px] bg-gray-50 rounded p-4">
          <img
            src={fileUrl}
            alt={document.filename}
            className="max-w-full max-h-full object-contain rounded shadow"
            style={{ transform: `scale(${zoom})`, maxHeight: '70vh' }}
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // PDFs - direct iframe embed
    if (fileType === 'pdf') {
      return (
        <div className="min-h-[600px] bg-gray-50 rounded">
          <iframe
            src={fileUrl}
            className="w-full h-full min-h-[600px] border-0 rounded"
            title={document.filename}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // Videos - direct video element
    if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(fileType)) {
      return (
        <div className="flex justify-center items-center min-h-[400px] bg-gray-50 rounded p-4">
          <video
            controls
            className="max-w-full max-h-full rounded shadow"
            style={{ maxHeight: '70vh' }}
            onError={() => setError('Failed to load video')}
          >
            <source src={fileUrl} type={`video/${fileType}`} />
            Your browser doesn't support video playback.
          </video>
        </div>
      );
    }

    // Audio - direct audio element
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(fileType)) {
      return (
        <div className="flex flex-col justify-center items-center min-h-[300px] bg-gray-50 rounded p-8">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-medium mb-4">{document.filename}</h3>
          <audio
            controls
            className="w-full max-w-lg"
            onError={() => setError('Failed to load audio')}
          >
            <source src={fileUrl} type={`audio/${fileType}`} />
            Your browser doesn't support audio playback.
          </audio>
        </div>
      );
    }

    // Text files - show extracted content or iframe
    if (fileType === 'txt') {
      if (document.extractedText) {
        return (
          <div className="min-h-[400px] bg-gray-50 rounded p-4">
            <pre 
              className="whitespace-pre-wrap text-sm font-mono overflow-auto"
              style={{ fontSize: `${zoom}rem` }}
            >
              {document.extractedText}
            </pre>
          </div>
        );
      } else {
        return (
          <div className="min-h-[400px] bg-gray-50 rounded">
            <iframe
              src={fileUrl}
              className="w-full h-full min-h-[400px] border-0 rounded"
              title={document.filename}
            />
          </div>
        );
      }
    }

    // Office documents - try iframe first, fallback to extracted content
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType)) {
      return (
        <div className="min-h-[500px] bg-gray-50 rounded">
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + fileUrl)}&embedded=true`}
            className="w-full h-full min-h-[500px] border-0 rounded"
            title={document.filename}
            onError={() => {
              // Fallback to extracted content if Google Docs viewer fails
              if (document.extractedText) {
                return (
                  <div className="p-6">
                    <h4 className="font-medium mb-3">Document Content:</h4>
                    <div className="bg-white p-4 rounded shadow max-h-96 overflow-y-auto">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {document.extractedText}
                      </p>
                    </div>
                  </div>
                );
              }
            }}
          />
        </div>
      );
    }

    // Default fallback - show file icon and extracted content
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-gray-50 rounded text-center p-8">
        <div className="text-8xl mb-4">{getFileTypeIcon(document.fileType)}</div>
        <h3 className="text-xl font-medium mb-2">{document.filename}</h3>
        <p className="text-gray-600 mb-4">{document.fileType?.toUpperCase()} File</p>
        
        {document.extractedText ? (
          <div className="mt-6 p-6 bg-white rounded shadow max-w-4xl w-full">
            <h4 className="font-medium mb-3 text-left">File Content:</h4>
            <div className="text-left max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {document.extractedText}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 mb-4">Preview not available for this file type</p>
        )}
        
        <button
          onClick={handleDownload}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
          Download File
        </button>
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