// Utility functions for area grouping

import { FolderNode, Area, Position } from './types';

/**
 * Create an area from a parent node and all its descendants
 */
export function createAreaFromNode(
  node: FolderNode,
  areaId: string,
  color: string = '#e3f2fd'
): Area {
  const allNodeIds = getAllDescendantIds(node);
  
  return {
    id: areaId,
    name: node.name,
    nodes: allNodeIds,
    color,
    position: node.position,
    size: { width: 400, height: 300 },
  };
}

/**
 * Get all descendant node IDs recursively
 */
function getAllDescendantIds(node: FolderNode): string[] {
  const ids = [node.id];
  if (node.children) {
    node.children.forEach((child) => {
      ids.push(...getAllDescendantIds(child));
    });
  }
  return ids;
}

/**
 * Calculate area bounds from node positions
 */
export function calculateAreaBounds(
  area: Area,
  nodes: { id: string; position: Position }[]
): { position: Position; size: { width: number; height: number } } {
  const areaNodes = nodes.filter((n) => area.nodes.includes(n.id));
  
  if (areaNodes.length === 0) {
    return {
      position: area.position,
      size: area.size,
    };
  }

  const minX = Math.min(...areaNodes.map((n) => n.position.x));
  const maxX = Math.max(...areaNodes.map((n) => n.position.x));
  const minY = Math.min(...areaNodes.map((n) => n.position.y));
  const maxY = Math.max(...areaNodes.map((n) => n.position.y));

  return {
    position: {
      x: minX - 20,
      y: minY - 20,
    },
    size: {
      width: maxX - minX + 240,
      height: maxY - minY + 120,
    },
  };
}

