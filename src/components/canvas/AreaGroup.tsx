'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Area } from '@/lib/types';

interface AreaGroupProps {
  area: Area;
  onZoomToArea: (area: Area) => void;
}

export default function AreaGroup({ area, onZoomToArea }: AreaGroupProps) {
  return (
    <motion.div
      layout
      className="absolute rounded-[32px] border border-[var(--color-border)]/60 bg-[var(--color-highlight)]/40 shadow-[0_25px_50px_-12px_rgba(2,6,23,0.6)] pointer-events-none"
      style={{
        left: `${area.position.x}px`,
        top: `${area.position.y}px`,
        width: `${area.size.width}px`,
        height: `${area.size.height}px`,
        background: `linear-gradient(120deg, ${area.color}55, #ffffffd9)`,
      }}
    >
      <div className="absolute inset-0 rounded-[32px] border-2 border-dashed border-white/30 pointer-events-none" />
      <button
        className="absolute top-4 left-4 rounded-full bg-[var(--color-surface)]/90 px-3 py-1 text-xs font-semibold text-[var(--color-text)] shadow pointer-events-auto hover:bg-[var(--color-surface)]"
        style={{ borderColor: area.color }}
        onClick={(e) => {
          e.stopPropagation();
          onZoomToArea(area);
        }}
      >
        {area.name} • Zoom
      </button>
    </motion.div>
  );
}

