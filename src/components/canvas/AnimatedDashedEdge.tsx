'use client';

import React, { useMemo } from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow';

function AnimatedDashedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = useMemo(
    () =>
      getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.2,
      }),
    [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]
  );

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth: 1,
        stroke: 'rgba(148, 163, 184, 0.5)',
        strokeDasharray: '8, 4',
        strokeDashoffset: 0,
        animation: 'dashdraw 2s linear infinite',
      }}
    />
  );
}

export default React.memo(AnimatedDashedEdge);

