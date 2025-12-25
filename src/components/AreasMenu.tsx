'use client';

import React from 'react';
import { ZoomIn, X } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';
import { Area } from '@/lib/types';
import { findNodeByIdRecursive } from '@/lib/utils';

export default function AreasMenu() {
  const areas = useFlowStore((state) => state.areas);
  const rootFolderIds = useFlowStore((state) => state.rootFolderIds);
  const unmarkAsArea = useFlowStore((state) => state.unmarkAsArea);
  const nodes = useFlowStore((state) => state.nodes);
  const setSelectedAreaId = useFlowStore((state) => state.setSelectedAreaId);

  // Get ReactFlow instance for zooming
  const handleZoomToArea = (area: Area) => {
    setSelectedAreaId(area.id);
    
    // Import ReactFlow's useReactFlow hook dynamically
    // We'll need to pass the zoom function from FolderCanvas
    // For now, we'll use a custom event or callback
    window.dispatchEvent(new CustomEvent('zoomToArea', { detail: { area } }));
  };

  if (areas.length === 0) {
    return null;
  }

  const isRootArea = (areaId: string) => rootFolderIds.has(areaId);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-[var(--color-panel)]/95 backdrop-blur-xl border-t border-[var(--color-border)] shadow-[0_-10px_40px_rgba(2,6,23,0.3)]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent">
          {areas.map((area) => {
            const folder = findNodeByIdRecursive(nodes, area.id);
            const areaColor = folder?.color || area.color || '#e0e0e0';
            const canUnmark = !isRootArea(area.id);

            return (
              <div
                key={area.id}
                className="flex-shrink-0 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm hover:shadow-md transition-all"
                style={{
                  borderColor: areaColor + '40',
                  backgroundColor: areaColor + '15',
                }}
              >
                <button
                  onClick={() => handleZoomToArea(area)}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)] hover:opacity-80 transition-opacity"
                >
                  <ZoomIn className="h-4 w-4 text-[var(--color-accent)]" />
                  <span>{area.name}</span>
                </button>
                
                {canUnmark && (
                  <button
                    onClick={() => unmarkAsArea(area.id)}
                    className="ml-1 p-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-colors"
                    title="Remove from Areas"
                  >
                    <X className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

