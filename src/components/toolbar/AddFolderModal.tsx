'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, HardDrive, Loader2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FolderPlus } from 'lucide-react';
import { fetchDrives, fetchDirectory, Drive, DirectoryResponse } from '@/lib/api';
import { useFlowStore } from '@/store/useFlowStore';
import { FolderNode } from '@/lib/types';
import { generateNodeId } from '@/lib/utils';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  path: string;
  type: 'drive' | 'folder';
}

export default function AddFolderModal({ isOpen, onClose }: AddFolderModalProps) {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<DirectoryResponse | null>(null);
  const [navigationStack, setNavigationStack] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const modalRef = useRef<HTMLDivElement>(null);
  const addRootFolder = useFlowStore((state) => state.addRootFolder);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentPath(null);
      setCurrentFolder(null);
      setNavigationStack([]);
      setError(null);
      loadDrives();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const loadDrives = async () => {
    setLoading(true);
    setError(null);
    try {
      const drivesList = await fetchDrives();
      setDrives(drivesList);
    } catch (err) {
      setError('Failed to load drives. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const convertDirectoryResponse = (dir: DirectoryResponse, isRoot = false, depth = 0): FolderNode => {
    const shouldExpand = isRoot || depth === 0;
    
    return {
      id: dir.id || generateNodeId(dir.path),
      name: dir.name,
      path: dir.path,
      icon: dir.icon || 'folder',
      color: dir.color || '#e0e0e0',
      position: dir.position || { x: 0, y: 0 },
      children: dir.children
        ? dir.children.map((child) => convertDirectoryResponse(child, false, depth + 1))
        : [],
      expanded: shouldExpand, // Expand root and first-level children
      hasChildren: Boolean(dir.children && dir.children.length > 0),
      connector: 'local-fs',
    };
  };

  const navigateToPath = async (path: string, name: string, type: 'drive' | 'folder', addToStack = true) => {
    setLoading(true);
    setError(null);
    try {
      const directory = await fetchDirectory(path);
      setCurrentPath(path);
      setCurrentFolder(directory);
      
      if (addToStack) {
        setNavigationStack(prev => [...prev, { name, path, type }]);
      }
    } catch (err) {
      setError(`Failed to load folder: ${path}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const navigateBack = async () => {
    if (navigationStack.length <= 1) {
      setCurrentPath(null);
      setCurrentFolder(null);
      setNavigationStack([]);
    } else {
      const newStack = navigationStack.slice(0, -1);
      const previousItem = newStack[newStack.length - 1];
      setNavigationStack(newStack);
      await navigateToPath(previousItem.path, previousItem.name, previousItem.type, false);
    }
  };

  const navigateToBreadcrumb = async (index: number) => {
    const targetItem = navigationStack[index];
    const newStack = navigationStack.slice(0, index + 1);
    setNavigationStack(newStack);
    await navigateToPath(targetItem.path, targetItem.name, targetItem.type, false);
  };

  const handleSelectDrive = (drive: Drive) => {
    navigateToPath(drive.path, drive.name, drive.type);
  };

  const handleSelectFolder = (folder: DirectoryResponse) => {
    navigateToPath(folder.path, folder.name, 'folder');
  };

  const handleConfirmSelection = async () => {
    if (!currentPath || !currentFolder) return;

    setLoading(true);
    setError(null);
    try {
      const folderNode = convertDirectoryResponse(currentFolder, true);

      const existingNodes = useFlowStore.getState().nodes;
      const offsetX = existingNodes.length * 400;
      const offsetY = 100;

      // Update position
      folderNode.position = { x: offsetX, y: offsetY };

      // Add to canvas
      addRootFolder(folderNode);

      onClose();
    } catch (err) {
      setError(`Failed to add folder. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return '—';
    }
  };

  const sortedFolders = useMemo(() => {
    if (!currentFolder?.children) return [];
    
    const folders = currentFolder.children.filter(child => child.children !== undefined);
    
    return [...folders].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        const dateA = a.modifiedDate ? new Date(a.modifiedDate).getTime() : 0;
        const dateB = b.modifiedDate ? new Date(b.modifiedDate).getTime() : 0;
        comparison = dateA - dateB;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [currentFolder, sortBy, sortOrder]);

  const handleSort = (column: 'name' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleNewFolder = () => {
    alert('New folder creation will be implemented soon');
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      style={{ zIndex: 99999 }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg mx-auto my-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Select Folder
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentPath && currentFolder && (
          <div className="mb-4">
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Current location:</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
              <Folder className="h-4 w-4 text-[var(--color-accent)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">{currentFolder.name}</span>
            </div>
          </div>
        )}

        {navigationStack.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={navigateBack}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>More locations</span>
            </button>
            <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] flex-1 overflow-x-auto">
              {navigationStack.map((item, index) => (
                <React.Fragment key={item.path}>
                  {index > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className="px-2 py-1 rounded hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition truncate max-w-[120px]"
                    title={item.name}
                  >
                    {item.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-rose-100 border border-rose-300 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
            <span className="ml-2 text-sm text-[var(--color-text-muted)]">
              Loading...
            </span>
          </div>
        )}

        {!loading && (
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            {currentPath === null ? (
              <>
                <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3 flex-shrink-0">
                  Select a drive to navigate:
                </p>
                <div className="grid grid-cols-1 gap-2 overflow-y-auto flex-1 min-h-0">
                  {drives.map((drive) => (
                    <button
                      key={drive.path}
                      onClick={() => handleSelectDrive(drive)}
                      disabled={loading}
                      className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 text-left transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {drive.type === 'drive' ? (
                        <HardDrive className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0" />
                      ) : (
                        <Folder className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--color-text)] truncate">
                          {drive.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {drive.path}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-2 border-b border-[var(--color-border)]">
                  <div className="grid grid-cols-[1fr_auto] gap-4 py-2 px-1">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 text-left text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    >
                      <span>Name</span>
                      {sortBy === 'name' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-2 text-left text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                    >
                      <span>Date modified</span>
                      {sortBy === 'date' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0">
                  {currentFolder && (
                    <div className="space-y-0">
                      <button
                        onClick={handleConfirmSelection}
                        className="w-full grid grid-cols-[1fr_auto] gap-4 py-3 px-3 rounded-lg hover:bg-[var(--color-surface-alt)] transition text-left border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Folder className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0" />
                          <span className="font-medium text-[var(--color-text)] truncate">
                            {currentFolder.name}
                          </span>
                        </div>
                        <div className="text-sm text-[var(--color-text-muted)]">
                          {formatDate(currentFolder.modifiedDate)}
                        </div>
                      </button>
                      
                      {sortedFolders.length > 0 && (
                        <>
                          <div className="my-1"></div>
                          {sortedFolders.map((child) => (
                            <button
                              key={child.id || child.path}
                              onClick={() => handleSelectFolder(child)}
                              disabled={loading}
                              className="w-full grid grid-cols-[1fr_auto] gap-4 py-3 px-3 rounded-lg hover:bg-[var(--color-surface-alt)] transition text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Folder className="h-5 w-5 text-[var(--color-accent)] flex-shrink-0" />
                                <span className="font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)]">
                                  {child.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-[var(--color-text-muted)]">
                                  {formatDate(child.modifiedDate)}
                                </span>
                                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {!loading && currentPath === null && drives.length === 0 && !error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No drives or folders available.
            </p>
          </div>
        )}

        {!loading && currentPath !== null && currentFolder && (!currentFolder.children || currentFolder.children.length === 0) && (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              This folder is empty. You can select it above.
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <button
            onClick={handleNewFolder}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="text-sm">New folder</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition"
            >
              Cancel
            </button>
            {currentPath && (
              <button
                onClick={handleConfirmSelection}
                disabled={loading || !currentPath}
                className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Select Folder
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

