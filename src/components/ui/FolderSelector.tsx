'use client';

import { useState, useEffect } from 'react';
import { FolderTreeItem } from '@/types';
import {
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface FolderSelectorProps {
  selectedFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  showCreateButton?: boolean;
  compact?: boolean;
  className?: string;
}

export function FolderSelector({
  selectedFolderId,
  onFolderSelect,
  onCreateNew,
  placeholder = "Select a folder...",
  showCreateButton = true,
  compact = false,
  className = ''
}: FolderSelectorProps) {
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  const findFolderById = (folders: FolderTreeItem[], id: string): FolderTreeItem | null => {
    for (const folder of folders) {
      if (folder.id === id) return folder;
      if (folder.children) {
        const found = findFolderById(folder.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getSelectedFolderName = () => {
    if (!selectedFolderId) return "📁 All Documents";
    const folder = findFolderById(folders, selectedFolderId);
    return folder ? `📁 ${folder.name}` : "📁 Unknown Folder";
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderSelect = (folderId: string | null) => {
    onFolderSelect(folderId);
    setIsOpen(false);
  };

  const renderFolder = (folder: FolderTreeItem, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-foreground'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFolderSelect(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="mr-2 p-0.5 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </button>
          )}
          
          <div
            className="w-4 h-4 mr-2 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: folder.color || '#3B82F6' }}
          >
            {isExpanded ? (
              <FolderOpenIcon className="w-4 h-4 text-white" />
            ) : (
              <FolderIcon className="w-4 h-4 text-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {folder.name}
            </span>
            {!compact && (
              <span className="ml-2 text-xs opacity-70">
                ({folder.documentCount})
              </span>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/20 border-t-primary mr-2"></div>
          Loading folders...
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 items-center justify-between"
      >
        <span className="truncate text-left">
          {selectedFolderId ? getSelectedFolderName() : placeholder}
        </span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2">
            {/* All Documents option */}
            <div
              className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                selectedFolderId === null
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-foreground'
              }`}
              onClick={() => handleFolderSelect(null)}
            >
              <div className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground">
                📁
              </div>
              <span className="text-sm font-medium">All Documents</span>
            </div>

            {/* Folder list */}
            <div className="mt-1">
              {folders.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <div className="text-2xl mb-2">📁</div>
                  <p>No folders yet</p>
                  {showCreateButton && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        onCreateNew?.();
                      }}
                      className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
                    >
                      <PlusIcon className="w-3 h-3 mr-1" />
                      Create your first folder
                    </button>
                  )}
                </div>
              ) : (
                folders.map(folder => renderFolder(folder))
              )}
            </div>

            {/* Create new folder button */}
            {showCreateButton && folders.length > 0 && (
              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateNew?.();
                  }}
                  className="flex items-center w-full py-2 px-3 rounded-lg text-sm text-primary hover:bg-accent transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create New Folder
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}