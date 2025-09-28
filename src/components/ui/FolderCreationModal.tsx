'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  FolderIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface FolderCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated?: (folder: any) => void;
  initialParentId?: string | null;
  className?: string;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3B82F6', emoji: '🔵' },
  { name: 'Green', value: '#10B981', emoji: '🟢' },
  { name: 'Purple', value: '#8B5CF6', emoji: '🟣' },
  { name: 'Orange', value: '#F59E0B', emoji: '🟠' },
  { name: 'Pink', value: '#EC4899', emoji: '🩷' },
  { name: 'Red', value: '#EF4444', emoji: '🔴' },
  { name: 'Yellow', value: '#EAB308', emoji: '🟡' },
  { name: 'Teal', value: '#14B8A6', emoji: '🔷' },
  { name: 'Indigo', value: '#6366F1', emoji: '🟦' },
  { name: 'Gray', value: '#6B7280', emoji: '⚫' }
];

export function FolderCreationModal({
  isOpen,
  onClose,
  onFolderCreated,
  initialParentId = null,
  className = ''
}: FolderCreationModalProps) {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].value);
  const [visibility, setVisibility] = useState<'PRIVATE' | 'ORGANIZATION' | 'SHARED'>('PRIVATE');
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [isLoading, setIsLoading] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        setFolders(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim() || isLoading) return;

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
          visibility,
          parentId
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Success feedback
        showNotification(`📁 "${folderName}" created successfully!`, 'success');
        
        // Reset and close
        resetForm();
        onClose();
        onFolderCreated?.(result.data);
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to create folder', 'error');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showNotification('Failed to create folder', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFolderName('');
    setDescription('');
    setSelectedColor(FOLDER_COLORS[0].value);
    setVisibility('PRIVATE');
    setParentId(initialParentId);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      handleClose();
    }
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

  const showNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const renderFolderOption = (folder: any, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = parentId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'hover:bg-accent/50 text-foreground'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => setParentId(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="mr-2 p-1 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </button>
          )}
          
          <div 
            className="w-4 h-4 mr-2 rounded-sm"
            style={{ backgroundColor: folder.color || '#3B82F6' }}
          ></div>
          
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {folder.name}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({folder.documentCount})
            </span>
          </div>
          
          {isSelected && (
            <CheckIcon className="w-4 h-4 text-primary" />
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child: any) => renderFolderOption(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-background border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Create New Folder</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Tips */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">💡 Pro Tips:</p>
                <p>Use <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Ctrl+Enter</kbd> to create quickly</p>
              </div>
            </div>
          </div>

          {/* Folder Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Folder Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter folder name..."
              disabled={isLoading}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this folder contains..."
              disabled={isLoading}
              rows={3}
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Folder Color</label>
            <div className="grid grid-cols-5 gap-3">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  disabled={isLoading}
                  className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedColor === color.value
                      ? 'border-foreground shadow-lg'
                      : 'border-border hover:border-border/60'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg mb-2 flex items-center justify-center"
                    style={{ backgroundColor: color.value }}
                  >
                    <FolderIcon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Folder Visibility</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'PRIVATE', label: 'Private', icon: '🔒', desc: 'Only you can see this folder' },
                { value: 'ORGANIZATION', label: 'Organization', icon: '🏢', desc: 'Everyone in your organization' },
                { value: 'SHARED', label: 'Shared', icon: '👥', desc: 'Specific people you choose' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVisibility(option.value as any)}
                  disabled={isLoading}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    visibility === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/60 hover:bg-accent/30'
                  }`}
                >
                  <div className="text-2xl mb-2">{option.icon}</div>
                  <div className="text-sm font-medium mb-1">{option.label}</div>
                  <div className="text-xs text-muted-foreground text-center">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Parent Folder Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Parent Folder (Optional)</label>
            <p className="text-xs text-muted-foreground">Choose a parent folder to organize this folder within another folder</p>
            
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              {/* No Parent Option */}
              <div
                className={`flex items-center py-3 px-4 cursor-pointer transition-colors border-b border-border ${
                  parentId === null
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent/50 text-foreground'
                }`}
                onClick={() => setParentId(null)}
              >
                <FolderIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm font-medium">No Parent (Root Level)</span>
                {parentId === null && (
                  <CheckIcon className="w-4 h-4 text-primary ml-auto" />
                )}
              </div>

              {/* Folder Options */}
              {folders.map(folder => renderFolderOption(folder))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
          <div className="text-sm text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-xs mr-1">Ctrl+Enter</kbd>
            to create quickly
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-input px-4 py-2 transition-all duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || isLoading}
              className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 transition-all duration-200 disabled:opacity-50 min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FolderIcon className="w-4 h-4 mr-2" />
                  Create Folder
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}