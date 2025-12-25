// Utility functions

import { Edge, Node, Position as HandlePosition } from "reactflow";
import { FolderNode, FolderNodeVisualData, Position } from "./types";

/**
 * Convert directory tree to ReactFlow nodes and edges
 */
interface ConvertOptions {
  parentId?: string;
  depth?: number;
  highlightedNodeIds?: Set<string>;
}

// Maximum nodes to render at once for performance
const MAX_RENDERED_NODES = 1000;

export function convertToReactFlowNodes(
  nodes: FolderNode[],
  options: ConvertOptions & { nodeCount?: { current: number } } = {}
): { nodes: Node<FolderNodeVisualData>[]; edges: Edge[] } {
  const reactFlowNodes: Node<FolderNodeVisualData>[] = [];
  const reactFlowEdges: Edge[] = [];
  const {
    parentId,
    depth = 0,
    highlightedNodeIds,
    nodeCount = { current: 0 },
  } = options;

  nodes.forEach((node) => {
    // Performance check: stop if we've rendered too many nodes
    if (nodeCount.current >= MAX_RENDERED_NODES) {
      return;
    }

    const childCount = node.children ? node.children.length : 0;
    const isHighlighted = highlightedNodeIds?.has(node.id) ?? false;

    const nodeData: FolderNodeVisualData = {
      label: node.name,
      path: node.path,
      icon: node.icon,
      color: node.color,
      children: node.children,
      expanded: node.expanded ?? false, // Default to false for performance
      depth,
      childCount,
      isHighlighted,
    };

    reactFlowNodes.push({
      id: node.id,
      type: "folderNode",
      position: node.position,
      data: nodeData,
      // Set handle positions for horizontal layout (edges from right to left)
      targetPosition: HandlePosition.Left,
      sourcePosition: HandlePosition.Right,
    });
    nodeCount.current++;

    if (parentId) {
      reactFlowEdges.push({
        id: `e${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: "animatedDashed",
        animated: false,
        style: {
          strokeWidth: 1,
        },
      });
    }

    // Only render children if node is expanded AND we haven't hit the limit
    if (
      node.children &&
      node.children.length > 0 &&
      node.expanded === true &&
      nodeCount.current < MAX_RENDERED_NODES
    ) {
      const childResult = convertToReactFlowNodes(node.children, {
        parentId: node.id,
        depth: depth + 1,
        highlightedNodeIds,
        nodeCount, // Pass the same counter object
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
  return path.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
}

/**
 * Format file path for display
 */
export function formatPath(path: string): string {
  if (path.length > 50) {
    return "..." + path.slice(-47);
  }
  return path;
}

/**
 * Find a node by ID recursively in a tree of nodes
 */
export function findNodeByIdRecursive(nodes: FolderNode[], id: string): FolderNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeByIdRecursive(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}
