'use client';

import { useState, useEffect, useRef } from 'react';
import { FolderTreeItem } from '@/types';
import {
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface FolderManagerProps {
  selectedFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderCreate?: (folder: any) => void;
  onFolderUpdate?: (folderId: string, data: any) => void;
  onFolderDelete?: (folderId: string) => void;
  className?: string;
}

const FOLDER_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Teal', value: '#14B8A6' }
];

export function FolderManager({
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  className = ''
}: FolderManagerProps) {
  const [folders, setFolders] = useState<FolderTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0].value);
  const [selectedVisibility, setSelectedVisibility] = useState<'PRIVATE' | 'ORGANIZATION' | 'SHARED'>('PRIVATE');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (creatingFolder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creatingFolder]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/folders');
      if (response.ok) {
        const result = await response.json();
        setFolders(result.data || []);
      } else {
        console.error('Failed to fetch folders');
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCreateFolder = () => {
    setCreatingFolder(true);
    setNewFolderName('');
    setSelectedColor(FOLDER_COLORS[0].value);
    setSelectedVisibility('PRIVATE');
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      inputRef.current?.focus();
      return;
    }

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: selectedColor,
          visibility: selectedVisibility,
          description: ''
        })
      });

      if (response.ok) {
        const result = await response.json();
        await fetchFolders();
        setCreatingFolder(false);
        setNewFolderName('');
        onFolderCreate?.(result.data);
        showNotification('Folder created successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to create folder', 'error');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showNotification('Failed to create folder', 'error');
    }
  };

  const handleStartEdit = (folder: FolderTreeItem) => {
    setEditingFolderId(folder.id);
    setNewFolderName(folder.name);
    setSelectedColor(folder.color || FOLDER_COLORS[0].value);
    setSelectedVisibility(folder.visibility);
  };

  const handleSaveEdit = async () => {
    if (!newFolderName.trim() || !editingFolderId) return;

    try {
      const response = await fetch(`/api/folders/${editingFolderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: selectedColor,
          visibility: selectedVisibility
        })
      });

      if (response.ok) {
        await fetchFolders();
        setEditingFolderId(null);
        setNewFolderName('');
        showNotification('Folder updated successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to update folder', 'error');
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      showNotification('Failed to update folder', 'error');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (!confirm(`Delete "${folderName}"? Documents inside will be moved to "All Documents".`)) {
      return;
    }

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchFolders();
        if (selectedFolderId === folderId) {
          onFolderSelect(null);
        }
        onFolderDelete?.(folderId);
        showNotification('Folder deleted successfully!', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to delete folder', 'error');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      showNotification('Failed to delete folder', 'error');
    }
  };

  const handleCancelCreate = () => {
    setCreatingFolder(false);
    setNewFolderName('');
  };

  const handleCancelEdit = () => {
    setEditingFolderId(null);
    setNewFolderName('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'create' | 'edit') => {
    if (e.key === 'Enter') {
      if (action === 'create') {
        handleCreateFolder();
      } else {
        handleSaveEdit();
      }
    } else if (e.key === 'Escape') {
      if (action === 'create') {
        handleCancelCreate();
      } else {
        handleCancelEdit();
      }
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
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const renderFolder = (folder: FolderTreeItem, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isEditing = editingFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    if (isEditing) {
      return (
        <div key={folder.id} className="select-none" style={{ paddingLeft: `${depth * 20 + 12}px` }}>
          <div className="flex items-center py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
            <div
              className="w-4 h-4 mr-2 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: selectedColor }}
            >
              <FolderIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => handleKeyPress(e, 'edit')}
                className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Folder name..."
                autoFocus
              />
              <div className="flex gap-1">
                {FOLDER_COLORS.slice(0, 4).map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedColor === color.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
                <select
                  value={selectedVisibility}
                  onChange={(e) => setSelectedVisibility(e.target.value as any)}
                  className="text-xs px-1 py-0.5 border border-input rounded"
                >
                  <option value="PRIVATE">🔒</option>
                  <option value="ORGANIZATION">🏢</option>
                  <option value="SHARED">👥</option>
                </select>
              </div>
              <button
                onClick={handleSaveEdit}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
                title="Save"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-red-600 hover:bg-red-100 rounded"
                title="Cancel"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors group ${
            isSelected
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'hover:bg-accent/50 text-foreground'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => onFolderSelect(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="mr-1 p-0.5 hover:bg-accent rounded"
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
            <div className="flex items-center">
              <span className="text-sm font-medium truncate">
                {folder.name}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({folder.documentCount})
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {folder.visibility === 'PRIVATE' ? (
              <span title="Private">🔒</span>
            ) : folder.visibility === 'ORGANIZATION' ? (
              <span title="Organization">🏢</span>
            ) : (
              <span title="Shared">👥</span>
            )}
            
            {folder.canEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(folder);
                }}
                className="p-1 hover:bg-accent rounded"
                title="Edit folder"
              >
                <PencilIcon className="w-3 h-3" />
              </button>
            )}
            
            {folder.canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id, folder.name);
                }}
                className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                title="Delete folder"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
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
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">My Folders</h3>
        <button
          onClick={handleQuickCreateFolder}
          className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-7 px-2 transition-colors"
          title="Create new folder"
        >
          <PlusIcon className="w-3 h-3 mr-1" />
          New
        </button>
      </div>

      <div
        className={`flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors ${
          selectedFolderId === null
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'hover:bg-accent/50 text-foreground'
        }`}
        onClick={() => onFolderSelect(null)}
      >
        <div className="w-4 h-4 mr-2 flex-shrink-0 text-muted-foreground">
          📁
        </div>
        <span className="text-sm font-medium">All Documents</span>
      </div>

      {creatingFolder && (
        <div className="flex items-center py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
          <div
            className="w-4 h-4 mr-2 flex-shrink-0 rounded-sm"
            style={{ backgroundColor: selectedColor }}
          >
            <FolderIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, 'create')}
              className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter folder name..."
            />
            <div className="flex gap-1">
              {FOLDER_COLORS.slice(0, 4).map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-4 h-4 rounded-full border-2 ${
                    selectedColor === color.value ? 'border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <select
                value={selectedVisibility}
                onChange={(e) => setSelectedVisibility(e.target.value as any)}
                className="text-xs px-1 py-0.5 border border-input rounded"
                title="Folder visibility"
              >
                <option value="PRIVATE">🔒</option>
                <option value="ORGANIZATION">🏢</option>
                <option value="SHARED">👥</option>
              </select>
            </div>
            <button
              onClick={handleCreateFolder}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
              title="Create folder (Enter)"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelCreate}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Cancel (Esc)"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1 max-h-96 overflow-y-auto">
        {folders.map(folder => renderFolder(folder))}
      </div>

      {folders.length === 0 && !creatingFolder && (
        <div className="text-center py-6 text-muted-foreground">
          <div className="text-4xl mb-2">📁</div>
          <p className="text-sm mb-2">No folders yet</p>
          <p className="text-xs mb-3">Create your first folder to organize documents</p>
          <button
            onClick={handleQuickCreateFolder}
            className="inline-flex items-center justify-center rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Create Folder
          </button>
        </div>
      )}

      {folders.length === 0 && !creatingFolder && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Quick Tips:</h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Press Enter to create, Esc to cancel</li>
            <li>• Click color dots to choose folder color</li>
            <li>• 🔒 Private, 🏢 Organization, 👥 Shared</li>
            <li>• Click any folder to filter documents</li>
          </ul>
        </div>
      )}
    </div>
  );
}