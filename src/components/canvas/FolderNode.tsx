'use client';

import React, { useState, memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, MapPin, X } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';
import ContextMenu from '../context-menu/ContextMenu';
import { formatPath } from '@/lib/utils';
import { FolderNodeVisualData } from '@/lib/types';

const FolderNode = memo(function FolderNode({
  data,
  id,
  selected,
}: NodeProps<FolderNodeVisualData>) {
  const viewMode = useFlowStore((state) => state.viewMode);
  const toggleNodeExpanded = useFlowStore((state) => state.toggleNodeExpanded);
  const setNodeExpanded = useFlowStore((state) => state.setNodeExpanded);
  const setHighlightedNodeIds = useFlowStore((state) => state.setHighlightedNodeIds);
  const markAsArea = useFlowStore((state) => state.markAsArea);
  const unmarkAsArea = useFlowStore((state) => state.unmarkAsArea);
  const rootFolderIds = useFlowStore((state) => state.rootFolderIds);
  const areas = useFlowStore((state) => state.areas);
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

  const handleToggle = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!hasChildren) return;
    toggleNodeExpanded(id);
  }, [hasChildren, toggleNodeExpanded, id]);

  const handleOpenFolder = useCallback(() => {
    fetch('http://localhost:3001/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: data.path }),
    }).catch(() => { });
    handleContextMenuClose();
  }, [data.path]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(`Share placeholder -> ${data.path}`);
    handleContextMenuClose();
  }, [data.path]);

  const handleHighlight = useCallback(() => {
    setHighlightedNodeIds([id]);
    handleContextMenuClose();
  }, [id, setHighlightedNodeIds]);

  const isRootFolder = rootFolderIds.has(id);
  const isArea = areas.some((area) => area.id === id);
  const canMarkAsArea = !isArea; // Allow any folder (including root) to be marked as Area
  const canUnmarkAsArea = isArea; // Allow any Area to be unmarked

  const handleMarkAsArea = useCallback(() => {
    markAsArea(id);
    handleContextMenuClose();
  }, [id, markAsArea]);

  const handleUnmarkAsArea = useCallback(() => {
    unmarkAsArea(id);
    handleContextMenuClose();
  }, [id, unmarkAsArea]);

  return (
    <>
      <motion.div
        onContextMenu={handleRightClick}
        onClick={() => hasChildren && toggleNodeExpanded(id)}
        className={`group relative w-[140px] rounded-lg border bg-white px-2.5 py-2 shadow-sm transition-all ${selected
            ? 'border-[var(--color-accent)] shadow-md'
            : 'border-gray-200'
          } ${data.isHighlighted
            ? 'ring-2 ring-[var(--color-accent)]/70 ring-offset-1'
            : 'ring-0'
          }`}
        style={{
          background: data.color || 'white',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
        />

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="text-base leading-none flex-shrink-0">{getIcon(data.icon)}</div>
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-medium truncate leading-tight"
              style={{
                color: data.color ? (isLightColor(data.color) ? '#1f2937' : '#ffffff') : '#1f2937'
              }}
            >
              {data.label}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Area button - visible on hover or when area is marked */}
            {(isArea || viewMode === 'edit') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isArea) {
                    handleUnmarkAsArea();
                  } else {
                    handleMarkAsArea();
                  }
                }}
                className={`rounded border p-0.5 flex-shrink-0 transition-colors ${
                  isArea
                    ? 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 opacity-0 group-hover:opacity-100'
                }`}
                title={isArea ? 'Unmark as Area' : 'Mark as Area'}
              >
                {isArea ? (
                  <MapPin className="h-3 w-3 fill-current" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
              </button>
            )}
            {hasChildren && (
              <button
                onClick={handleToggle}
                className="rounded border border-gray-200 bg-white p-0.5 text-gray-500 hover:bg-gray-50 flex-shrink-0 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Right}
        />
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
              label: isArea ? 'Unmark as Area' : 'Mark as Area',
              action: isArea ? handleUnmarkAsArea : handleMarkAsArea,
              icon: isArea ? '❌' : '📍',
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
});

FolderNode.displayName = 'FolderNode';

export default FolderNode;

function getIcon(iconName: string): string {
  // If iconName is already an emoji, return it directly
  if (/[\u{1F300}-\u{1F9FF}]/u.test(iconName)) {
    return iconName;
  }

  // Map string keys to emoji icons
  const icons: Record<string, string> = {
    folder: '📁',
    file: '📄',
    default: '📂',
  };
  return icons[iconName] || icons.default || iconName;
}

// Helper function to determine if a color is light
function isLightColor(color: string): boolean {
  try {
    // Remove # if present
    const hex = color.replace('#', '');

    if (hex.length !== 6) return true; // Default to light if invalid

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return true if light (luminance > 0.5)
    return luminance > 0.5;
  } catch {
    return true; // Default to light color on error
  }
}

