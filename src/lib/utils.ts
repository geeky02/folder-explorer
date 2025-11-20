// Utility functions

import { Edge, Node } from 'reactflow';
import { FolderNode, FolderNodeVisualData, Position } from './types';

/**
 * Convert directory tree to ReactFlow nodes and edges
 */
interface ConvertOptions {
  parentId?: string;
  depth?: number;
  highlightedNodeIds?: Set<string>;
}

export function convertToReactFlowNodes(
  nodes: FolderNode[],
  options: ConvertOptions = {}
): { nodes: Node<FolderNodeVisualData>[]; edges: Edge[] } {
  const reactFlowNodes: Node<FolderNodeVisualData>[] = [];
  const reactFlowEdges: Edge[] = [];
  const { parentId, depth = 0, highlightedNodeIds } = options;

  nodes.forEach((node) => {
    const childCount = node.children ? node.children.length : 0;
    const isHighlighted = highlightedNodeIds?.has(node.id) ?? false;

    const nodeData: FolderNodeVisualData = {
      label: node.name,
      path: node.path,
      icon: node.icon,
      color: node.color,
      children: node.children,
      expanded: node.expanded ?? true,
      depth,
      childCount,
      isHighlighted,
    };

    reactFlowNodes.push({
      id: node.id,
      type: 'folderNode',
      position: node.position,
      data: nodeData,
    });

    if (parentId) {
      reactFlowEdges.push({
        id: `e${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'bezier',
        animated: false,
        style: {
          strokeWidth: Math.max(1, Math.min(4, childCount / 2 + 1)),
          stroke: '#CBD5F5',
        },
      });
    }

    if (node.children && node.children.length > 0 && node.expanded !== false) {
      const childResult = convertToReactFlowNodes(node.children, {
        parentId: node.id,
        depth: depth + 1,
        highlightedNodeIds,
      });
      reactFlowNodes.push(...childResult.nodes);
      reactFlowEdges.push(...childResult.edges);
    }
  });

  return { nodes: reactFlowNodes, edges: reactFlowEdges };
}

/**
 * Generate unique ID for nodes
 */
export function generateNodeId(path: string): string {
  return path.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  return Math.sqrt(
    Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
  );
}

/**
 * Format file path for display
 */
export function formatPath(path: string): string {
  if (path.length > 50) {
    return '...' + path.slice(-47);
  }
  return path;
}

