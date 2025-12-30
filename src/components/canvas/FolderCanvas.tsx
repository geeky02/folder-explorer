'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  Connection,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  OnSelectionChangeFunc,
  Viewport,
  ConnectionLineType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useFlowStore } from '@/store/useFlowStore';
import { Area } from '@/lib/types';
import { convertToReactFlowNodes } from '@/lib/utils';
import FolderNodeComponent from './FolderNode';
import AnimatedDashedEdge from './AnimatedDashedEdge';

const nodeTypes: NodeTypes = {
  folderNode: FolderNodeComponent,
};

const edgeTypes: EdgeTypes = {
  animatedDashed: AnimatedDashedEdge,
};

interface FolderCanvasProps {
  className?: string;
}

const nodeWidth = 140;
const nodeHeight = 50;

function FlowCanvas({ className }: FolderCanvasProps) {
  const {
    nodes: storeNodes,
    viewMode,
    updateNodePosition,
    setZoom,
    setPan,
    setSelectedAreaId,
    setSelectedNodeId,
    highlightedNodeIds,
  } = useFlowStore();

  const [nodes, setNodesState, onNodesChange] = useNodesState([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
  const { fitView, getNodes } = useReactFlow();
  const viewportUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStoreNodesRef = useRef<string>('');
  const isDraggingRef = useRef(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastDragNodeRef = useRef<Node | null>(null);
  const justFinishedDragRef = useRef(false);
  const manuallyMovedNodesRef = useRef<Set<string>>(new Set());

  const highlightedSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds]
  );

  const isEditable = viewMode === 'edit';

  const applyTreeLayout = useCallback((nodes: Node[], edges: Edge[], preservePositions = true, fixedNodeIds?: Set<string>) => {
    if (nodes.length === 0) return nodes;
    if (edges.length === 0) {
      return nodes.map((node, index) => ({
        ...node,
        position: { x: index * 250, y: 100 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      }));
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const parentToChildren = new Map<string, string[]>(); // parent -> children

    edges.forEach(edge => {
      if (!parentToChildren.has(edge.source)) {
        parentToChildren.set(edge.source, []);
      }
      parentToChildren.get(edge.source)!.push(edge.target);
    });

    // Build set of nodes to preserve positions for
    const nodesToPreserve = new Set<string>();

    // Add manually moved nodes and their descendants
    const manuallyMovedWithDescendants = new Set<string>();
    const addDescendants = (nodeId: string) => {
      manuallyMovedWithDescendants.add(nodeId);
      nodesToPreserve.add(nodeId);
      const children = parentToChildren.get(nodeId) || [];
      children.forEach(childId => {
        addDescendants(childId);
      });
    };
    manuallyMovedNodesRef.current.forEach(nodeId => {
      addDescendants(nodeId);
    });

    // Add fixed nodes (parents that should stay in place during expand/collapse)
    if (fixedNodeIds) {
      fixedNodeIds.forEach(nodeId => {
        nodesToPreserve.add(nodeId);
        // Also preserve existing children of fixed nodes (they were already positioned)
        const existingChildren = parentToChildren.get(nodeId) || [];
        existingChildren.forEach(childId => {
          // Only preserve if child already exists in nodes (was visible before)
          if (nodes.find(n => n.id === childId)) {
            nodesToPreserve.add(childId);
          }
        });
      });
    }

    if (preservePositions && nodesToPreserve.size > 0) {
      const nodesToLayout = nodes.filter(n => !nodesToPreserve.has(n.id));
      const edgesToLayout = edges.filter(
        e => !nodesToPreserve.has(e.source) && !nodesToPreserve.has(e.target)
      );

      if (nodesToLayout.length > 0 && edgesToLayout.length > 0) {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));

        dagreGraph.setGraph({
          rankdir: 'LR',
          align: 'UL',
          nodesep: 80,
          ranksep: 60,
          edgesep: 10,
          acyclicer: 'greedy',
          ranker: 'tight-tree',
        });

        nodesToLayout.forEach((node) => {
          dagreGraph.setNode(node.id, {
            width: nodeWidth,
            height: nodeHeight,
          });
        });

        edgesToLayout.forEach((edge) => {
          dagreGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(dagreGraph);

        const layoutedNodes = nodes.map((node) => {
          if (nodesToPreserve.has(node.id)) {
            return {
              ...node,
              targetPosition: Position.Left,
              sourcePosition: Position.Right,
            };
          }

          const nodeWithPosition = dagreGraph.node(node.id);
          if (!nodeWithPosition) {
            return {
              ...node,
              targetPosition: Position.Left,
              sourcePosition: Position.Right,
            };
          }

          const x = nodeWithPosition.x - nodeWidth / 2;
          const y = nodeWithPosition.y - nodeHeight / 2;

          return {
            ...node,
            position: { x, y },
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
          };
        });

        return layoutedNodes;
      }
    }

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const totalNodes = nodes.length;
    const maxChildren = Math.max(...Array.from(parentToChildren.values()).map(children => children.length), 0);

    const nodesep = totalNodes > 50 ? 100 : totalNodes > 20 ? 80 : 60;
    const ranksep = maxChildren > 10 ? 80 : maxChildren > 5 ? 60 : 40;

    dagreGraph.setGraph({
      rankdir: 'LR',
      align: 'UL',
      nodesep,
      ranksep,
      edgesep: 10,
      acyclicer: 'greedy',
      ranker: 'tight-tree',
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        return {
          ...node,
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        };
      }

      const x = nodeWithPosition.x - nodeWidth / 2;
      const y = nodeWithPosition.y - nodeHeight / 2;

      return {
        ...node,
        position: { x, y },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      };
    });

    return layoutedNodes;
  }, []);

  useEffect(() => {
    if (storeNodes.length === 0) {
      setNodesState([]);
      setEdgesState([]);
      previousStoreNodesRef.current = '';
      return;
    }

    const createNodeSignature = (nodes: typeof storeNodes): string => {
      return JSON.stringify(nodes.map(n => ({
        id: n.id,
        children: n.children?.length || 0,
        expanded: n.expanded
        // Note: We don't include position in signature to avoid layout on position-only changes
      })));
    };
    const nodeSignature = createNodeSignature(storeNodes);
    const structureChanged = previousStoreNodesRef.current !== nodeSignature;

    // Find nodes that changed their expanded state (for preserving parent positions)
    // When a folder is expanded/collapsed, we want to keep the parent in place
    // and only reposition newly visible/hidden children
    const fixedNodeIds = new Set<string>();
    if (structureChanged && previousStoreNodesRef.current !== '') {
      try {
        const previousNodes = JSON.parse(previousStoreNodesRef.current) as Array<{ id: string; expanded?: boolean; children?: number }>;
        const previousNodeMap = new Map(previousNodes.map(n => [n.id, n]));

        // Helper to recursively find all visible descendants
        const getVisibleDescendantIds = (node: typeof storeNodes[0], visited = new Set<string>()): string[] => {
          if (visited.has(node.id)) return [];
          visited.add(node.id);
          const ids: string[] = [];
          if (node.expanded && node.children) {
            node.children.forEach(child => {
              ids.push(child.id);
              ids.push(...getVisibleDescendantIds(child, visited));
            });
          }
          return ids;
        };

        storeNodes.forEach(node => {
          const prevNode = previousNodeMap.get(node.id);
          if (prevNode) {
            // Always preserve the parent's position
            fixedNodeIds.add(node.id);

            // If this node was expanded before, preserve all its children that were visible
            if (prevNode.expanded && node.children) {
              node.children.forEach(child => {
                // If child has a position, it was visible before - preserve it
                if (child.position && (child.position.x !== 0 || child.position.y !== 0)) {
                  fixedNodeIds.add(child.id);
                  // Also preserve grandchildren that were visible
                  if (child.expanded && child.children) {
                    child.children.forEach(grandchild => {
                      if (grandchild.position && (grandchild.position.x !== 0 || grandchild.position.y !== 0)) {
                        fixedNodeIds.add(grandchild.id);
                      }
                    });
                  }
                }
              });
            }
          } else {
            // New node - don't fix it, let layout position it
          }
        });
      } catch (e) {
        // If parsing fails, don't fix any nodes
      }
    }

    const { nodes: rfNodes, edges: rfEdges } = convertToReactFlowNodes(
      storeNodes,
      { highlightedNodeIds: highlightedSet }
    );

    // Helper to find a node in the store tree (including nested children)
    // Also verify by path to ensure we get the correct node even if IDs somehow conflict
    const findStoreNode = (nodeId: string, verifyPath?: string): typeof storeNodes[0] | undefined => {
      const findInTree = (nodes: typeof storeNodes): typeof storeNodes[0] | undefined => {
        for (const node of nodes) {
          if (node.id === nodeId) {
            // If verifyPath is provided, ensure the path matches (extra safety check)
            if (!verifyPath || node.path === verifyPath) {
              return node;
            }
          }
          if (node.children) {
            const found = findInTree(node.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      return findInTree(storeNodes);
    };

    const nodesWithStorePositions = rfNodes.map(rfNode => {
      // Find node in store (including nested children)
      // Use path verification to ensure we get the correct node
      const storeNode = findStoreNode(rfNode.id, rfNode.data?.path);

      // If node has a stored position, always use it (preserves manually adjusted positions)
      if (storeNode && storeNode.position) {
        return {
          ...rfNode,
          position: storeNode.position,
        };
      }

      // If no stored position, use the default from rfNode
      return rfNode;
    });

    // Check if nodes are stacked (have same or very close positions)
    const checkIfStacked = (nodes: Node[]) => {
      if (nodes.length <= 1) return false;
      const positions = nodes.map(n => ({ x: n.position.x, y: n.position.y }));
      const uniquePositions = new Set(positions.map(p => `${Math.round(p.x / 50)}_${Math.round(p.y / 50)}`));
      // If more than 50% of nodes share the same position, they're stacked
      return uniquePositions.size < nodes.length * 0.5;
    };

    // Check if this is just an expand/collapse operation (not initial load or stacked nodes)
    const isInitialLoad = previousStoreNodesRef.current === '';
    const isJustExpandCollapse = structureChanged && !isInitialLoad && !checkIfStacked(nodesWithStorePositions);

    // Don't layout if:
    // 1. We just finished dragging (positions are being saved)
    // 2. Currently dragging
    // Layout should only run when structure actually changes (expand/collapse) or nodes are stacked
    // NOT when only positions have changed (user dragging)
    const needsLayout = (structureChanged || checkIfStacked(nodesWithStorePositions)) && !isDraggingRef.current && !justFinishedDragRef.current;

    // Track which nodes have EVER been visible (have stored positions or were in previous render)
    // This helps us identify truly new nodes vs nodes that were just collapsed/expanded
    const nodesWithStoredPositions = new Set<string>();
    const collectNodesWithPositions = (nodes: typeof storeNodes): void => {
      for (const node of nodes) {
        // If node has a stored position, it was visible before
        if (node.position && (node.position.x !== 0 || node.position.y !== 0)) {
          nodesWithStoredPositions.add(node.id);
        }
        if (node.children) {
          collectNodesWithPositions(node.children);
        }
      }
    };
    collectNodesWithPositions(storeNodes);

    // Also track which nodes were visible in the previous ReactFlow render
    const previouslyVisibleInRender = new Set<string>();
    if (previousStoreNodesRef.current !== '') {
      try {
        const previousNodes = JSON.parse(previousStoreNodesRef.current) as Array<{ id: string; expanded?: boolean }>;
        const previousNodeMap = new Map(previousNodes.map(n => [n.id, n]));

        // Helper to collect all visible node IDs from previous render
        const collectVisibleIds = (nodes: typeof storeNodes, parentExpanded: boolean = true): void => {
          for (const node of nodes) {
            const prevNode = previousNodeMap.get(node.id);
            const wasExpanded = prevNode?.expanded ?? false;

            if (parentExpanded) {
              previouslyVisibleInRender.add(node.id);
              if (wasExpanded && node.children) {
                collectVisibleIds(node.children, true);
              }
            }
          }
        };
        collectVisibleIds(storeNodes, true);
      } catch (e) {
        // If parsing fails, assume no nodes were visible before
      }
    }

    // Build parent-to-children map
    const parentToChildren = new Map<string, string[]>();
    rfEdges.forEach(edge => {
      if (!parentToChildren.has(edge.source)) {
        parentToChildren.set(edge.source, []);
      }
      parentToChildren.get(edge.source)!.push(edge.target);
    });

    // Get current node positions from ReactFlow state
    const currentReactFlowNodes = getNodes();
    const currentNodeMap = new Map(currentReactFlowNodes.map(n => [n.id, n]));

    // CRITICAL FIX: For expand/collapse, preserve ALL current positions first
    // Only position nodes that are truly newly visible and don't exist in current ReactFlow state
    if (isJustExpandCollapse) {
      // Count how many nodes actually need repositioning
      let nodesNeedingPosition = 0;
      const positionedNodes = nodesWithStorePositions.map(node => {
        const storeNode = findStoreNode(node.id, node.data?.path);
        const currentNode = currentNodeMap.get(node.id);
        const hasStoredPosition = storeNode && storeNode.position &&
          (storeNode.position.x !== 0 || storeNode.position.y !== 0);
        const wasVisibleInPreviousRender = previouslyVisibleInRender.has(node.id);
        const currentPosition = currentNode?.position;
        const isManuallyMoved = manuallyMovedNodesRef.current.has(node.id);

        // CRITICAL RULE 1: If node exists in current ReactFlow, ALWAYS use its current position
        // This is the most important rule - it preserves all currently visible nodes
        // This ensures that when you drag nodes and then expand a folder, your dragged positions are preserved
        if (currentNode && currentPosition && (currentPosition.x !== 0 || currentPosition.y !== 0)) {
          return {
            ...node,
            position: currentPosition,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
          };
        }

        // Rule 2: If node has stored position, use it (for nodes not currently in ReactFlow)
        // This ensures dragged positions persist for nodes that were collapsed
        if (hasStoredPosition) {
          return {
            ...node,
            position: storeNode!.position,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
          };
        }

        // Rule 3: If node was visible in previous render, keep its position from nodesWithStorePositions
        // This preserves positions for nodes that were just collapsed/expanded
        if (wasVisibleInPreviousRender && node.position && (node.position.x !== 0 || node.position.y !== 0)) {
          return {
            ...node,
            position: node.position,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
          };
        }

        // Rule 4: Node is newly visible and has no stored position - position it relative to parent
        // This only happens for truly new nodes that have never been positioned
        const parentEdge = rfEdges.find(e => e.target === node.id);
        if (parentEdge) {
          // Get parent position - check current state first, then store
          const parentFromCurrent = currentNodeMap.get(parentEdge.source);
          const parentFromStore = nodesWithStorePositions.find(n => n.id === parentEdge.source);
          const parentNode = parentFromCurrent || parentFromStore;

          if (parentNode && parentNode.position) {
            const siblings = parentToChildren.get(parentEdge.source) || [];
            const siblingIndex = siblings.indexOf(node.id);
            const totalSiblings = siblings.length;

            // Position children 80px to the right of parent
            const parentX = parentNode.position.x + nodeWidth + 80;
            const parentY = parentNode.position.y;
            const verticalSpacing = 60;
            const totalHeight = (totalSiblings - 1) * verticalSpacing;
            const startY = parentY - totalHeight / 2;

            return {
              ...node,
              position: {
                x: parentX,
                y: startY + siblingIndex * verticalSpacing,
              },
              targetPosition: Position.Left,
              sourcePosition: Position.Right,
            };
          }
        }

        // Fallback: use current position or default
        return {
          ...node,
          position: currentPosition || node.position || { x: 0, y: 0 },
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        };
      });

      setNodesState(positionedNodes);
      setEdgesState(rfEdges);

      // SIMPLE SAVE LOGIC: Only save positions for newly visible nodes that don't have stored positions
      positionedNodes.forEach((node) => {
        const storeNode = findStoreNode(node.id, node.data?.path);
        if (!storeNode || (node.data?.path && storeNode.path !== node.data.path)) {
          return;
        }

        const hasStoredPosition = storeNode.position &&
          (storeNode.position.x !== 0 || storeNode.position.y !== 0);
        const wasVisibleInPreviousRender = previouslyVisibleInRender.has(node.id);
        const isManuallyMoved = manuallyMovedNodesRef.current.has(node.id);

        // Only save if:
        // 1. Node is truly newly visible (wasn't in previous render) AND doesn't have stored position, OR
        // 2. Node is manually moved (to persist drag changes)
        if (!wasVisibleInPreviousRender && !hasStoredPosition) {
          // Truly newly visible node without stored position - save the calculated position
          updateNodePosition(node.id, node.position);
        } else if (isManuallyMoved) {
          // Manually moved node - always update to persist drag changes
          if (hasStoredPosition) {
            const dx = Math.abs(node.position.x - storeNode.position.x);
            const dy = Math.abs(node.position.y - storeNode.position.y);
            if (dx > 0.5 || dy > 0.5) {
              updateNodePosition(node.id, node.position);
            }
          } else {
            // No stored position yet, save it
            updateNodePosition(node.id, node.position);
          }
        }
        // For all other cases, do NOTHING - positions are already stored or should remain unchanged
      });

      previousStoreNodesRef.current = nodeSignature;
    } else if (needsLayout) {
      // For initial load or stacked nodes, use full Dagre layout
      const isLargeTree = nodesWithStorePositions.length > 20;
      const preservePositions = !checkIfStacked(nodesWithStorePositions) && !structureChanged && !isLargeTree;

      // Get current ReactFlow positions to preserve them
      const currentReactFlowNodes = getNodes();
      const currentNodeMap = new Map(currentReactFlowNodes.map(n => [n.id, n]));

      const layoutedNodes = applyTreeLayout(
        nodesWithStorePositions,
        rfEdges,
        preservePositions,
        structureChanged ? fixedNodeIds : undefined
      );

      // CRITICAL: Preserve current ReactFlow positions for all nodes that are currently visible
      // Only use Dagre positions for nodes that don't exist in current ReactFlow state
      const finalNodes = layoutedNodes.map(node => {
        const currentNode = currentNodeMap.get(node.id);
        if (currentNode && currentNode.position && (currentNode.position.x !== 0 || currentNode.position.y !== 0)) {
          // Node is currently visible - preserve its current position
          return {
            ...node,
            position: currentNode.position,
          };
        }
        // Node is not currently visible (newly visible) - use Dagre position
        return node;
      });

      setNodesState(finalNodes);
      setEdgesState(rfEdges);

      // Only save positions for nodes that were positioned by Dagre (not currently visible)
      // Never overwrite positions for currently visible nodes
      finalNodes.forEach((node) => {
        const currentNode = currentNodeMap.get(node.id);
        // Only save if node is not currently visible (it's newly visible)
        if (!currentNode) {
          updateNodePosition(node.id, node.position);
        }
      });

      // Update signature AFTER positions are saved to ensure next render uses new positions
      previousStoreNodesRef.current = nodeSignature;

      // Only fit view on initial load, not when just expanding/collapsing
      if (isInitialLoad && !preservePositions) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            fitView({ padding: 0.2, duration: 300 });
          }, 150);
        });
      }
    } else {
      // Just update nodes/edges without re-layout if structure hasn't changed and positions are good
      setNodesState(nodesWithStorePositions);
      setEdgesState(rfEdges);
    }
  }, [storeNodes, highlightedSet, setNodesState, setEdgesState, applyTreeLayout, updateNodePosition, fitView, getNodes]);

  // Handle node drag - track dragging state and initial positions
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!isEditable) return;

      // On first drag, initialize tracking
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        lastDragNodeRef.current = node;

        // Get all selected nodes
        const selectedNodes = nodes.filter(n => n.selected);

        // Store initial positions of all selected nodes (or just the dragged one if none selected)
        const nodesToTrack = selectedNodes.length > 1 ? selectedNodes : [node];
        dragStartPositionsRef.current.clear();

        nodesToTrack.forEach(n => {
          dragStartPositionsRef.current.set(n.id, { x: n.position.x, y: n.position.y });
        });
      }

      // If multiple nodes are selected, ReactFlow handles moving them together
      // We just need to track that dragging is happening
      lastDragNodeRef.current = node;
    },
    [nodes, isEditable]
  );

  // Handle node drag end - save positions of all selected nodes
  const onNodeDragStop = useCallback(
    () => {
      if (!isEditable) return;

      // Mark that we just finished dragging to prevent layout from resetting positions
      justFinishedDragRef.current = true;
      isDraggingRef.current = false;

      // Use requestAnimationFrame to get the latest node positions after ReactFlow updates
      requestAnimationFrame(() => {
        const currentNodes = getNodes();

        setTimeout(() => {
          // Build a map of stored positions for quick diff
          // Use a map with both ID and path as key to ensure uniqueness
          const storedPositions = new Map<string, { x: number; y: number; path?: string }>();
          const flatten = (list: typeof storeNodes) => {
            list.forEach(n => {
              storedPositions.set(n.id, { ...n.position, path: n.path });
              if (n.children) flatten(n.children);
            });
          };
          flatten(storeNodes);

          // Update positions for any node that actually moved, and mark as manually moved
          currentNodes.forEach(curr => {
            const stored = storedPositions.get(curr.id);
            const currPath = curr.data?.path;

            // Verify we're working with the correct node by checking path if available
            if (stored && stored.path && currPath && stored.path !== currPath) {
              // Path mismatch - this shouldn't happen with unique IDs, but skip to be safe
              console.warn(`Path mismatch for node ${curr.id}: stored=${stored.path}, current=${currPath}`);
              return;
            }

            if (stored) {
              // Node has a stored position - check if it moved
              const dx = Math.abs(curr.position.x - stored.x);
              const dy = Math.abs(curr.position.y - stored.y);
              if (dx > 0.5 || dy > 0.5) {
                updateNodePosition(curr.id, curr.position);
                manuallyMovedNodesRef.current.add(curr.id);
              }
            } else {
              // Node doesn't have a stored position yet - save it and mark as manually moved
              // This handles cases where nodes are dragged before they have positions saved
              updateNodePosition(curr.id, curr.position);
              manuallyMovedNodesRef.current.add(curr.id);
            }
          });

          // Clear the flag after a delay to allow positions to be saved
          setTimeout(() => {
            justFinishedDragRef.current = false;
          }, 200);

          dragStartPositionsRef.current.clear();
          lastDragNodeRef.current = null;
        }, 10);
      });
    },
    [isEditable, updateNodePosition, getNodes, storeNodes]
  );

  // Handle node click (open folder)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  // Handle node double click to open folder (view mode only)
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (viewMode !== 'view') {
        return;
      }

      const folderPath = node.data?.path;
      if (!folderPath) return;

      fetch('http://localhost:3001/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      }).catch(() => { });
    },
    [viewMode]
  );

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      setEdgesState((eds) => addEdge(params, eds));
    },
    [setEdgesState]
  );

  // Handle viewport changes (debounced for performance)
  const onMove = useCallback(
    (_: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      // Clear existing timeout
      if (viewportUpdateTimeoutRef.current) {
        clearTimeout(viewportUpdateTimeoutRef.current);
      }

      // Debounce viewport updates to prevent excessive store updates
      viewportUpdateTimeoutRef.current = setTimeout(() => {
        setPan({ x: viewport.x, y: viewport.y });
        setZoom(viewport.zoom);
      }, 100);
    },
    [setPan, setZoom]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (viewportUpdateTimeoutRef.current) {
        clearTimeout(viewportUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Handle area zoom
  const handleZoomToArea = useCallback(
    (area: Area) => {
      setSelectedAreaId(area.id);

      // Get area node IDs
      const areaNodeIds = area.nodes;
      if (areaNodeIds.length === 0) return;

      // Zoom to area nodes with padding
      fitView({
        nodes: nodes.filter((node) => areaNodeIds.includes(node.id)),
        padding: 0.2,
        duration: 500,
        minZoom: 0.1,
        maxZoom: 1.5,
      });
    },
    [nodes, fitView, setSelectedAreaId]
  );

  // Listen for zoom requests from AreasMenu
  useEffect(() => {
    const handleZoomEvent = (event: CustomEvent<{ area: Area }>) => {
      handleZoomToArea(event.detail.area);
    };

    window.addEventListener('zoomToArea', handleZoomEvent as EventListener);
    return () => {
      window.removeEventListener('zoomToArea', handleZoomEvent as EventListener);
    };
  }, [handleZoomToArea]);

  const handleSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: selectedNodes }) => {
      if (selectedNodes && selectedNodes.length > 0) {
        setSelectedNodeId(selectedNodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    },
    [setSelectedNodeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <ReactFlow
        className="relative z-10"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={isEditable}
        nodesConnectable={false}
        elementsSelectable
        fitView={false}
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        selectionOnDrag
        panOnDrag={!isEditable}
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{
          type: 'animatedDashed',
          animated: false,
          style: { strokeWidth: 1 }
        }}
        proOptions={{ hideAttribution: true }}
        elevateNodesOnSelect
        selectNodesOnDrag={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--color-border)" />
        <Controls position="bottom-left" />
        <MiniMap
          pannable
          nodeColor={(node) => {
            return node.data?.color || '#94a3b8';
          }}
          maskColor="var(--color-app-bg)"
        />
      </ReactFlow>
    </div>
  );
}

export default function FolderCanvas({ className }: FolderCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas className={className} />
    </ReactFlowProvider>
  );
}
