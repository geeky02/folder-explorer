'use client';

import React from 'react';
import { Sparkles, RefreshCw, MoonStar, SunMedium } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';

export default function Toolbar() {
  const {
    layoutMode,
    viewMode,
    setLayoutMode,
    setViewMode,
    selectedNodeId,
    selectedAreaId,
    updateNodeColor,
    updateNodeIcon,
    updateAreaColor,
    expandAllNodes,
    collapseAllNodes,
    refreshLayout,
    theme,
    toggleTheme,
  } = useFlowStore();

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

      {/* Layout Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          Layout:
        </span>
        <button
          onClick={() => setLayoutMode('auto')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            layoutMode === 'auto'
              ? 'bg-emerald-400 text-[#022c22]'
              : 'bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
          }`}
        >
          Auto
        </button>
        <button
          onClick={() => setLayoutMode('freeflow')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            layoutMode === 'freeflow'
              ? 'bg-emerald-400 text-[#022c22]'
              : 'bg-[var(--color-surface-alt)] text-[var(--color-text)] hover:bg-[var(--color-surface)]'
          }`}
        >
          Freeflow
        </button>
        <button
          onClick={refreshLayout}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <RefreshCw className="h-4 w-4" />
          Re-run layout
        </button>
      </div>

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
    </div>
  );
}

