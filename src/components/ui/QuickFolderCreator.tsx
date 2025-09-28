'use client';

import { useState, useRef, useEffect } from 'react';
import { PlusIcon, FolderIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface QuickFolderCreatorProps {
  onFolderCreated?: (folder: any) => void;
  onCancel?: () => void;
  placeholder?: string;
  compact?: boolean;
  showInline?: boolean;
  className?: string;
}

const QUICK_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' }
];

export function QuickFolderCreator({
  onFolderCreated,
  onCancel,
  placeholder = "New folder name...",
  compact = false,
  showInline = false,
  className = ''
}: QuickFolderCreatorProps) {
  const [isCreating, setIsCreating] = useState(showInline);
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(QUICK_COLORS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateFolder = async () => {
    if (!folderName.trim() || isLoading) return;

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          color: selectedColor,
          visibility: 'PRIVATE',
          description: ''
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Success feedback
        showQuickNotification(`📁 "${folderName}" created!`, 'success');
        
        // Reset form
        setFolderName('');
        setSelectedColor(QUICK_COLORS[0].value);
        
        // Close if not inline
        if (!showInline) {
          setIsCreating(false);
        }
        
        // Notify parent
        onFolderCreated?.(result.data);
      } else {
        const error = await response.json();
        showQuickNotification(error.error || 'Failed to create folder', 'error');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showQuickNotification('Failed to create folder', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFolderName('');
    setSelectedColor(QUICK_COLORS[0].value);
    setIsCreating(false);
    onCancel?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const showQuickNotification = (message: string, type: 'success' | 'error') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  // If not creating and not inline, show the trigger button
  if (!isCreating && !showInline) {
    return (
      <button
        onClick={() => setIsCreating(true)}
        className={`inline-flex items-center justify-center rounded-lg transition-all duration-200 hover:scale-105 ${
          compact 
            ? 'h-8 w-8 bg-primary/10 hover:bg-primary/20 text-primary' 
            : 'h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg'
        } ${className}`}
        title="Create new folder"
      >
        <PlusIcon className={compact ? "w-4 h-4" : "w-4 h-4 mr-2"} />
        {!compact && "New Folder"}
      </button>
    );
  }

  // Creation form
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input row */}
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: selectedColor }}
        >
          <FolderIcon className="w-4 h-4 text-white" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
        />
        
        <button
          onClick={handleCreateFolder}
          disabled={!folderName.trim() || isLoading}
          className="p-1 rounded text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Create folder (Enter)"
        >
          <CheckIcon className="w-5 h-5" />
        </button>
        
        {!showInline && (
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 rounded text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
            title="Cancel (Esc)"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Color picker row */}
      <div className="flex items-center gap-2 pl-10">
        <span className="text-xs text-muted-foreground">Color:</span>
        <div className="flex gap-1">
          {QUICK_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                selectedColor === color.value 
                  ? 'border-foreground shadow-md' 
                  : 'border-transparent hover:border-border'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Help text */}
      {showInline && (
        <div className="text-xs text-muted-foreground pl-10">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to create
        </div>
      )}
    </div>
  );
}