'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  Connection,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  OnSelectionChangeFunc,
  Viewport,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useFlowStore } from '@/store/useFlowStore';
import { Area } from '@/lib/types';
import { convertToReactFlowNodes } from '@/lib/utils';
import FolderNodeComponent from './FolderNode';
import AreaGroup from './AreaGroup';
import AnimatedDashedEdge from './AnimatedDashedEdge';

// Custom node types
const nodeTypes: NodeTypes = {
  folderNode: FolderNodeComponent,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  animatedDashed: AnimatedDashedEdge,
};

interface FolderCanvasProps {
  className?: string;
}

// Node dimensions for layout calculation
const nodeWidth = 140;
const nodeHeight = 50;

function FlowCanvas({ className }: FolderCanvasProps) {
  const {
    nodes: storeNodes,
    areas,
    viewMode,
    updateNodePosition,
    setZoom,
    setPan,
    setSelectedAreaId,
    setSelectedNodeId,
    highlightedNodeIds,
    activeConnector,
  } = useFlowStore();

  const [nodes, setNodesState, onNodesChange] = useNodesState([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const viewportUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStoreNodesRef = useRef<string>('');

  const highlightedSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds]
  );

  // Apply Dagre tree layout
  const applyTreeLayout = useCallback((nodes: Node[], edges: any[]) => {
    if (nodes.length === 0) return nodes;
    if (edges.length === 0) {
      // If no edges, just position nodes in a grid
      return nodes.map((node, index) => ({
        ...node,
        position: { x: index * 250, y: 100 },
      }));
    }

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    // Configure for tree layout (top to bottom)
    dagreGraph.setGraph({
      rankdir: 'TB', // Top to bottom
      align: 'UL', // Upper left alignment
      nodesep: 80, // Horizontal spacing between nodes at same level
      ranksep: 100, // Vertical spacing between levels
      edgesep: 30,
      acyclicer: 'greedy',
      ranker: 'tight-tree', // Use tight-tree for better tree layout
    });

    // Add nodes to graph
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight,
      });
    });

    // Add edges to graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run layout
    dagre.layout(dagreGraph);

    // Apply positions from Dagre
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        return node;
      }

      // Convert Dagre position (center-based) to ReactFlow position (top-left based)
      const x = nodeWithPosition.x - nodeWidth / 2;
      const y = nodeWithPosition.y - nodeHeight / 2;

      return {
        ...node,
        position: { x, y },
        targetPosition: 'top' as const,
        sourcePosition: 'bottom' as const,
      };
    });

    return layoutedNodes;
  }, []);

  // Convert store nodes to ReactFlow format and apply layout
  useEffect(() => {
    if (storeNodes.length === 0) {
      setNodesState([]);
      setEdgesState([]);
      previousStoreNodesRef.current = '';
      return;
    }

    // Create a signature of the node structure to detect changes
    const nodeSignature = JSON.stringify(storeNodes.map(n => ({ id: n.id, children: n.children?.length || 0 })));
    const structureChanged = previousStoreNodesRef.current !== nodeSignature;

    const { nodes: rfNodes, edges: rfEdges } = convertToReactFlowNodes(
      storeNodes,
      { highlightedNodeIds: highlightedSet }
    );

    // Check if nodes are stacked (have same or very close positions)
    const checkIfStacked = (nodes: Node[]) => {
      if (nodes.length <= 1) return false;
      const positions = nodes.map(n => ({ x: n.position.x, y: n.position.y }));
      const uniquePositions = new Set(positions.map(p => `${Math.round(p.x / 50)}_${Math.round(p.y / 50)}`));
      // If more than 50% of nodes share the same position, they're stacked
      return uniquePositions.size < nodes.length * 0.5;
    };

    const needsLayout = structureChanged || checkIfStacked(rfNodes);

    // Apply tree layout when structure changes, nodes are stacked, or on initial load
    if (needsLayout) {
      const layoutedNodes = applyTreeLayout(rfNodes, rfEdges);
      setNodesState(layoutedNodes);
      setEdgesState(rfEdges);
      previousStoreNodesRef.current = nodeSignature;

      // Update store with new positions
      requestAnimationFrame(() => {
        layoutedNodes.forEach((node) => {
          updateNodePosition(node.id, node.position);
        });

        // Fit view after layout
        setTimeout(() => {
          fitView({ padding: 0.2, duration: 300 });
        }, 150);
      });
    } else {
      // Just update nodes/edges without re-layout if structure hasn't changed and positions are good
      setNodesState(rfNodes);
      setEdgesState(rfEdges);
    }
  }, [storeNodes, highlightedSet, setNodesState, setEdgesState, applyTreeLayout, updateNodePosition, fitView]);

  // Handle node drag (update edges in real-time)
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Force edges to update by triggering a re-render
      // ReactFlow handles this automatically, but we ensure smooth updates
    },
    []
  );

  // Handle node drag end (save position in freeflow mode)
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
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
      }).catch((err) => console.error('Failed to open folder:', err));
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
    (_: React.MouseEvent | null, viewport: Viewport) => {
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

  const isEditable = viewMode === 'edit';

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

  const connectorLabelMap: Record<string, string> = {
    'everything-sdk': 'Everything SDK (Windows)',
    'local-fs': 'Local File System',
    gdrive: 'Google Drive Connector',
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {areas.length > 0 && (
        <div className="absolute inset-0 z-0">
          {areas.map((area) => (
            <AreaGroup
              key={area.id}
              area={area}
              onZoomToArea={handleZoomToArea}
            />
          ))}
        </div>
      )}

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
        <Background variant="dots" gap={18} size={1} color="var(--color-border)" />
        <Controls position="bottom-left" />
        <MiniMap
          pannable
          nodeColor={(node) => {
            return node.data?.color || '#94a3b8';
          }}
          maskColor="var(--color-app-bg)"
        />
        <Panel position="bottom-right">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Active Connector
            </p>
            <p className="text-sm font-medium text-slate-800">
              {connectorLabelMap[activeConnector] ?? activeConnector}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Mode: {viewMode} • Layout: Freeflow
            </p>
          </div>
        </Panel>
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

