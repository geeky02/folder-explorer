'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';
import ContextMenu from '../context-menu/ContextMenu';
import { formatPath } from '@/lib/utils';
import { FolderNodeVisualData } from '@/lib/types';

export default function FolderNode({
  data,
  id,
  selected,
}: NodeProps<FolderNodeVisualData>) {
  const {
    viewMode,
    toggleNodeExpanded,
    setNodeExpanded,
    setHighlightedNodeIds,
  } = useFlowStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const hasChildren = (data.childCount ?? 0) > 0;
  const isCollapsed = data.expanded === false;

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(data.path);
    handleContextMenuClose();
  };

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!hasChildren) return;
    toggleNodeExpanded(id);
  };

  const handleOpenFolder = () => {
    fetch('http://localhost:3001/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: data.path }),
    }).catch((err) => console.error('Failed to open folder:', err));
    handleContextMenuClose();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`Share placeholder -> ${data.path}`);
    handleContextMenuClose();
  };

  const handleHighlight = () => {
    setHighlightedNodeIds([id]);
    handleContextMenuClose();
  };

  return (
    <>
      <motion.div
        layout
        onContextMenu={handleRightClick}
        onClick={() => hasChildren && toggleNodeExpanded(id)}
        className={`group relative min-w-[200px] max-w-[260px] rounded-2xl border px-4 py-3 shadow-[0_20px_35px_rgba(2,6,23,0.45)] transition-all ${
          selected
            ? 'border-[var(--color-accent)]'
            : 'border-[var(--color-border)]'
        } ${
          data.isHighlighted
            ? 'ring-2 ring-[var(--color-accent)]/70 ring-offset-2'
            : 'ring-0'
        }`}
        style={{
          background: data.color
            ? `linear-gradient(135deg, ${data.color} 0%, rgba(255,255,255,0.07) 100%)`
            : 'var(--color-node-gradient)',
        }}
      >
        <Handle type="target" position={Position.Top} />

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="text-2xl leading-none drop-shadow">{getIcon(data.icon)}</div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {data.label}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {formatPath(data.path)}
              </p>
            </div>
          </div>
          {hasChildren && (
            <button
              onClick={handleToggle}
              className="rounded-full border border-slate-200 bg-white/70 p-1 text-slate-600 hover:bg-white shadow"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
          {hasChildren && (
            <span className="rounded-full bg-white/30 px-2 py-0.5 text-[var(--color-text)]">
              {data.childCount} items
            </span>
          )}
          <span className="rounded-full border border-dashed border-white/50 px-2 py-0.5 text-[var(--color-text)]">
            Depth {data.depth ?? 0}
          </span>
          {viewMode === 'edit' && (
            <span className="rounded-full border border-white/70 px-2 py-0.5 text-amber-300">
              Edit mode
            </span>
          )}
        </div>

        <Handle type="source" position={Position.Bottom} />
      </motion.div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleContextMenuClose}
          options={[
            { label: 'Copy path', action: handleCopyPath, icon: '📋' },
            {
              label: isCollapsed ? 'Expand node' : 'Collapse node',
              action: () => {
                setNodeExpanded(id, isCollapsed);
                handleContextMenuClose();
              },
              icon: isCollapsed ? '➕' : '➖',
            },
            {
              label: 'Highlight node',
              action: handleHighlight,
              icon: '✨',
            },
            {
              label: 'Open folder',
              action: handleOpenFolder,
              icon: '📂',
            },
            {
              label: 'Share (soon)',
              action: handleShare,
              icon: '🔗',
            },
          ]}
        />
      )}
    </>
  );
}

function getIcon(iconName: string): string {
  const icons: Record<string, string> = {
    folder: '📁',
    file: '📄',
    default: '📂',
  };
  return icons[iconName] || icons.default;
}

