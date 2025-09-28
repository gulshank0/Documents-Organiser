'use client';

import { useState, useEffect } from 'react';
import { FolderTreeItem } from '@/types';
import {
  FolderIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DocumentFolderActionsProps {
  documentIds: string[];
  currentFolderId?: string | null;
  onMoveComplete?: (folderId: string | null) => void;
  onCancel?: () => void;
  className?: string;
}

export function DocumentFolderActions({
  documentIds,
  currentFolderId,
  onMoveComplete,
  onCancel,
  className = ''
}: DocumentFolderActionsProps) {
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId || null);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        setFolders(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveDocuments = async () => {
    if (moving) return;

    try {
      setMoving(true);
      
      console.log('Starting document move operation:', {
        documentIds,
        selectedFolderId,
        currentFolderId
      });
      
      // Move each document
      const movePromises = documentIds.map(async (documentId) => {
        console.log(`Moving document ${documentId} to folder ${selectedFolderId}`);
        
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            folderId: selectedFolderId === null ? null : selectedFolderId 
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to move document ${documentId}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.details || 'Failed to move document';
            
            // If we have both error and details, combine them for better context
            if (errorData.error && errorData.details && errorData.error !== errorData.details) {
              errorMessage = `${errorData.error}: ${errorData.details}`;
            }
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          
          throw new Error(`Document ${documentId}: ${errorMessage}`);
        }

        return response.json();
      });

      await Promise.all(movePromises);
      console.log('All documents moved successfully');
      onMoveComplete?.(selectedFolderId);
    } catch (error) {
      console.error('Error moving documents:', error);
      
      // Show more detailed error message to user
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while moving documents';
        
      alert(`Failed to move documents: ${errorMessage}`);
    } finally {
      setMoving(false);
    }
  };

  const renderFolderOption = (folder: FolderTreeItem, depth = 0) => {
    const isSelected = selectedFolderId === folder.id;
    const isCurrent = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary/10 text-primary border border-primary/20'
              : isCurrent
              ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
              : 'hover:bg-accent/50 text-foreground'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => !isCurrent && setSelectedFolderId(folder.id)}
        >
          <div
            className="w-4 h-4 mr-2 flex-shrink-0 rounded"
            style={{ backgroundColor: folder.color || '#3B82F6' }}
          >
            <FolderIcon className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="text-sm font-medium truncate">
                {folder.name}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({folder.documentCount})
              </span>
              {isCurrent && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (current)
                </span>
              )}
            </div>
          </div>

          {isSelected && !isCurrent && (
            <CheckIcon className="w-4 h-4 text-primary" />
          )}
        </div>

        {folder.children && folder.children.map(child => 
          renderFolderOption(child, depth + 1)
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Move {documentIds.length} document{documentIds.length === 1 ? '' : 's'}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="text-sm text-muted-foreground">
        Select a destination folder or choose "No Folder" to move to the root level.
      </div>

      {/* No Folder option */}
      <div
        className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
          selectedFolderId === null
            ? 'bg-primary/10 text-primary border border-primary/20'
            : currentFolderId === null
            ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
            : 'hover:bg-accent/50 text-foreground'
        }`}
        onClick={() => currentFolderId !== null && setSelectedFolderId(null)}
      >
        <FolderIcon className="w-4 h-4 mr-2 text-muted-foreground" />
        <span className="text-sm font-medium">No Folder (Root Level)</span>
        {currentFolderId === null && (
          <span className="ml-2 text-xs text-muted-foreground">(current)</span>
        )}
        {selectedFolderId === null && currentFolderId !== null && (
          <CheckIcon className="w-4 h-4 text-primary ml-auto" />
        )}
      </div>

      {/* Folder list */}
      <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
        {folders.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <FolderIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No folders available</p>
          </div>
        ) : (
          folders.map(folder => renderFolderOption(folder))
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
        <button
          onClick={onCancel}
          disabled={moving}
          className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleMoveDocuments}
          disabled={moving || (selectedFolderId === currentFolderId)}
          className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 disabled:opacity-50 transition-colors"
        >
          {moving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/20 border-t-primary-foreground mr-2"></div>
              Moving...
            </>
          ) : (
            <>
              <ArrowRightIcon className="w-4 h-4 mr-2" />
              Move Documents
            </>
          )}
        </button>
      </div>
    </div>
  );
}