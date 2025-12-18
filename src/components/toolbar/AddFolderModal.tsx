'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, HardDrive, Loader2 } from 'lucide-react';
import { fetchDrives, fetchDirectory, Drive, DirectoryResponse } from '@/lib/api';
import { useFlowStore } from '@/store/useFlowStore';
import { FolderNode } from '@/lib/types';
import { generateNodeId } from '@/lib/utils';

interface AddFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFolderModal({ isOpen, onClose }: AddFolderModalProps) {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const addRootFolder = useFlowStore((state) => state.addRootFolder);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
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

  const convertDirectoryResponse = (dir: DirectoryResponse, isRoot = false): FolderNode => {
    return {
      id: dir.id || generateNodeId(dir.path),
      name: dir.name,
      path: dir.path,
      icon: dir.icon || 'folder',
      color: dir.color || '#e0e0e0',
      position: dir.position || { x: 0, y: 0 },
      children: dir.children
        ? dir.children.map((child) => convertDirectoryResponse(child, false))
        : [],
      expanded: isRoot,
      hasChildren: Boolean(dir.children && dir.children.length > 0),
      connector: 'local-fs',
    };
  };

  const handleSelectDrive = async (drive: Drive) => {
    setLoading(true);
    setError(null);
    try {
      const directory = await fetchDirectory(drive.path);
      const folderNode = convertDirectoryResponse(directory, true); 

      const existingNodes = useFlowStore.getState().nodes;
      const offsetX = existingNodes.length * 400;
      const offsetY = 100;

      folderNode.position = { x: offsetX, y: offsetY };

      addRootFolder(folderNode);

      onClose();
    } catch (err) {
      setError(`Failed to load folder: ${drive.path}. Please try again.`);
    } finally {
      setLoading(false);
    }
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">
            Add Folder or Drive
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

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

        {!loading && drives.length > 0 && (
          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <p className="text-sm font-medium text-[var(--color-text-muted)] mb-3 flex-shrink-0">
              Select a drive or folder to add to the canvas:
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
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && drives.length === 0 && !error && (
          <div className="py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              No drives or folders available.
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Google Drive integration coming soon
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
