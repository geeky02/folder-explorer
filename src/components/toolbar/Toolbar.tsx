'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MoonStar, SunMedium, Save, ChevronDown, Trash2, FolderPlus } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';
import AddFolderModal from './AddFolderModal';

export default function Toolbar() {
  const viewMode = useFlowStore((state) => state.viewMode);
  const setViewMode = useFlowStore((state) => state.setViewMode);
  const selectedNodeId = useFlowStore((state) => state.selectedNodeId);
  const selectedAreaId = useFlowStore((state) => state.selectedAreaId);
  const updateNodeColor = useFlowStore((state) => state.updateNodeColor);
  const updateNodeIcon = useFlowStore((state) => state.updateNodeIcon);
  const updateAreaColor = useFlowStore((state) => state.updateAreaColor);
  const expandAllNodes = useFlowStore((state) => state.expandAllNodes);
  const collapseAllNodes = useFlowStore((state) => state.collapseAllNodes);
  const theme = useFlowStore((state) => state.theme);
  const toggleTheme = useFlowStore((state) => state.toggleTheme);
  const savedLayouts = useFlowStore((state) => state.savedLayouts);
  const activeLayoutId = useFlowStore((state) => state.activeLayoutId);
  const saveLayout = useFlowStore((state) => state.saveLayout);
  const loadLayout = useFlowStore((state) => state.loadLayout);
  const deleteLayout = useFlowStore((state) => state.deleteLayout);
  const activeLayout = savedLayouts.find((layout) => layout.id === activeLayoutId) || null;
  const formatLayoutLabel = (layout: (typeof savedLayouts)[number]) => {
    const updatedAt = new Date(layout.updatedAt);
    return `${layout.name} • ${updatedAt.toLocaleString()}`;
  };

  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
  const saveLayoutRef = useRef<HTMLDivElement>(null);

  const colors = [
    '#e0e0e0',
    '#ffebee',
    '#e8f5e9',
    '#e3f2fd',
    '#fff3e0',
    '#f3e5f5',
    '#e0f2f1',
  ];

  const areaPalette = ['#FEE2E2', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#E0E7FF'];

  const icons = ['📁', '📂', '🗂️', '📋', '💾', '📀'];

  const handleColorChange = (color: string) => {
    if (selectedNodeId) {
      updateNodeColor(selectedNodeId, color);
    }
  };

  const handleIconChange = (icon: string) => {
    if (selectedNodeId) {
      updateNodeIcon(selectedNodeId, icon);
    }
  };

  const handleAreaColorChange = (color: string) => {
    if (selectedAreaId) {
      updateAreaColor(selectedAreaId, color);
    }
  };

  const handleSaveLayout = async () => {
    if (!layoutName.trim()) {
      return;
    }
    await saveLayout(layoutName.trim());
    setLayoutName('');
    setIsSavingLayout(false);
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (saveLayoutRef.current && !saveLayoutRef.current.contains(event.target as Node)) {
        setIsSavingLayout(false);
        setLayoutName('');
      }
    };

    if (isSavingLayout) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSavingLayout]);

  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-panel)]/80 px-4 py-3 text-[var(--color-text)] shadow-[0_4px_30px_rgba(2,6,23,0.35)] backdrop-blur">
      {/* View/Edit Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Mode:
        </span>
        <button
          onClick={() => setViewMode('view')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            viewMode === 'view'
              ? 'bg-[var(--color-accent)] text-[#031527]'
              : 'bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
          }`}
        >
          View
        </button>
        <button
          onClick={() => setViewMode('edit')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            viewMode === 'edit'
              ? 'bg-[var(--color-accent)] text-[#031527]'
              : 'bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
          }`}
        >
          Edit
        </button>
      </div>

      <div className="h-6 w-px bg-[var(--color-border)]" />

      {/* Layout Mode - Always Freeflow */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Layout:
        </span>
        <div className="px-3 py-1.5 rounded text-sm font-medium bg-emerald-400 text-[#022c22]">
          Freeflow
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={saveLayoutRef}>
            <button
              onClick={() => setIsSavingLayout((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-accent)]"
            >
              <Save className="h-4 w-4" />
              Save layout
              <ChevronDown className="h-3 w-3" />
            </button>
            {isSavingLayout && (
              <div className="absolute right-0 top-full mt-2 w-64 z-50 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                  Save layout
                </p>
                <input
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveLayout();
                    } else if (e.key === 'Escape') {
                      setIsSavingLayout(false);
                      setLayoutName('');
                    }
                  }}
                  placeholder="Layout name"
                  className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsSavingLayout(false);
                      setLayoutName('');
                    }}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveLayout}
                    className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-sm font-medium text-[#031527] hover:bg-[var(--color-accent-strong)]"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>

          {savedLayouts.length > 0 && (
            <div className="relative">
              <select
                value={activeLayoutId ?? ''}
                onChange={(e) => {
                  const layoutId = e.target.value;
                  if (!layoutId) return;
                  loadLayout(layoutId);
                }}
                className="rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)]"
              >
                <option value="">Load saved layout</option>
                {savedLayouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {formatLayoutLabel(layout)}
                  </option>
                ))}
              </select>
              {activeLayoutId && (
                <button
                  onClick={() => deleteLayout(activeLayoutId)}
                  className="absolute -right-8 top-1/2 -translate-y-1/2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-[var(--color-text-muted)] hover:text-rose-400"
                  title="Delete layout"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {activeLayout && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Saved {new Date(activeLayout.updatedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-[var(--color-border)]" />

      {/* Add Folder button */}
      <button
        onClick={() => setIsAddFolderModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-1.5 text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] transition"
      >
        <FolderPlus className="h-4 w-4" />
        Add Folder
      </button>

      <div className="h-6 w-px bg-[var(--color-border)]" />

      {/* Tree actions */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Tree actions:
        </span>
        <button
          onClick={expandAllNodes}
          className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] shadow-sm hover:text-[var(--color-accent)]"
        >
          Expand all
        </button>
        <button
          onClick={collapseAllNodes}
          className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] shadow-sm hover:text-[var(--color-accent)]"
        >
          Collapse all
        </button>
      </div>

      <div className="h-6 w-px bg-[var(--color-border)]" />

      <button
        onClick={toggleTheme}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-accent)]"
      >
        {theme === 'dark' ? (
          <>
            <MoonStar className="h-4 w-4 text-[var(--color-accent)]" />
            Dark
          </>
        ) : (
          <>
            <SunMedium className="h-4 w-4 text-amber-500" />
            Light
          </>
        )}
      </button>

      {viewMode === 'edit' && selectedNodeId && (
        <>
          <div className="h-6 w-px bg-[var(--color-border)]" />

          {/* Color Picker */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Node color:
            </span>
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className="h-6 w-6 rounded-full border-2 border-white/40 shadow-inner transition hover:scale-105"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Icon Picker */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Node icon:
            </span>
            <div className="flex gap-1">
              {icons.map((icon) => (
                <button
                  key={icon}
                  onClick={() => handleIconChange(icon)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] text-lg shadow-sm"
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedAreaId && (
        <>
          <div className="h-6 w-px bg-[var(--color-border)]" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Area color:
            </span>
            <div className="flex gap-1">
              {areaPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => handleAreaColorChange(color)}
                  className="h-6 w-6 rounded-lg border border-white/40 shadow hover:scale-105"
                  style={{ backgroundColor: color }}
                  title={`Area ${color}`}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedNodeId && viewMode === 'edit' && (
        <div className="ml-auto inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Select a node to customize style.
        </div>
      )}

      {/* Add Folder Modal */}
      <AddFolderModal
        isOpen={isAddFolderModalOpen}
        onClose={() => setIsAddFolderModalOpen(false)}
      />
    </div>
  );
}

