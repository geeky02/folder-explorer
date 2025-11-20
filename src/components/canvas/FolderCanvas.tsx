'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Connection,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  OnSelectionChangeFunc,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useFlowStore } from '@/store/useFlowStore';
import { Area } from '@/lib/types';
import { convertToReactFlowNodes } from '@/lib/utils';
import FolderNodeComponent from './FolderNode';
import AreaGroup from './AreaGroup';
import dagre from 'dagre';

// Custom node types
const nodeTypes: NodeTypes = {
  folderNode: FolderNodeComponent,
};

interface FolderCanvasProps {
  className?: string;
}

function FlowCanvas({ className }: FolderCanvasProps) {
  const {
    nodes: storeNodes,
    areas,
    layoutMode,
    viewMode,
    updateNodePosition,
    setZoom,
    setPan,
    setSelectedAreaId,
    setSelectedNodeId,
    highlightedNodeIds,
    layoutRefreshToken,
    activeConnector,
  } = useFlowStore();

  const [nodes, setNodesState, onNodesChange] = useNodesState([]);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

  const highlightedSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds]
  );

  // Convert store nodes to ReactFlow format
  useEffect(() => {
    if (storeNodes.length === 0) {
      setNodesState([]);
      setEdgesState([]);
      return;
    }

    const { nodes: rfNodes, edges: rfEdges } = convertToReactFlowNodes(
      storeNodes,
      { highlightedNodeIds: highlightedSet }
    );
    setNodesState(rfNodes);
    setEdgesState(rfEdges);
  }, [storeNodes, highlightedSet, setNodesState, setEdgesState]);

  // Apply auto layout using Dagre
  const applyAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: 200,
        height: 80,
      });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const rootIds = nodes
      .filter((node) => !edges.some((edge) => edge.target === node.id))
      .map((node) => node.id);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      if (!nodeWithPosition) {
        return node;
      }
      const baseY = nodeWithPosition.y - 40;
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 100,
          y: rootIds.includes(node.id) ? baseY + 120 : baseY,
        },
      };
    });

    setNodesState(layoutedNodes);

    // Update store with new positions
    layoutedNodes.forEach((node) => {
      updateNodePosition(node.id, node.position);
    });

    setTimeout(() => fitView({ padding: 0.2 }), 120);
  }, [nodes, edges, setNodesState, updateNodePosition, fitView]);

  // Apply auto layout when layout mode changes or nodes are loaded
  useEffect(() => {
    if (layoutMode === 'auto' && nodes.length > 0 && edges.length > 0) {
      const timer = setTimeout(() => {
        applyAutoLayout();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [
    layoutMode,
    nodes.length,
    edges.length,
    layoutRefreshToken,
    applyAutoLayout,
  ]);

  // Handle node drag end (save position in freeflow mode)
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (layoutMode === 'freeflow') {
        updateNodePosition(node.id, node.position);
      }
    },
    [layoutMode, updateNodePosition]
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

  // Handle viewport changes
  const onMove = useCallback(
    (_: React.MouseEvent | null, viewport: Viewport) => {
      setPan({ x: viewport.x, y: viewport.y });
      setZoom(viewport.zoom);
    },
    [setPan, setZoom]
  );

  // Handle area zoom
  const handleZoomToArea = useCallback(
    (area: Area) => {
      setSelectedAreaId(area.id);
      
      // Calculate bounding box of area nodes
      const areaNodes = nodes.filter((node) => area.nodes.includes(node.id));
      if (areaNodes.length === 0) return;

      const minX = Math.min(...areaNodes.map((n) => n.position.x));
      const maxX = Math.max(...areaNodes.map((n) => n.position.x));
      const minY = Math.min(...areaNodes.map((n) => n.position.y));
      const maxY = Math.max(...areaNodes.map((n) => n.position.y));

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = maxX - minX + 400; // Add padding
      const height = maxY - minY + 400;

      // Zoom to area
      fitView({
        x: centerX - width / 2,
        y: centerY - height / 2,
        zoom: Math.min(1.5, Math.min(800 / width, 600 / height)),
        duration: 500,
      });
    },
    [nodes, fitView, setSelectedAreaId]
  );

  const isEditable = viewMode === 'edit' && layoutMode === 'freeflow';

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
        onNodeDragStop={onNodeDragStop}
        onMove={onMove}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={isEditable}
        nodesConnectable={false}
        elementsSelectable
        fitView
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        selectionOnDrag
        panOnDrag={!isEditable}
        defaultEdgeOptions={{ animated: false, style: { stroke: '#CBD5F5' } }}
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
              Mode: {viewMode} • Layout: {layoutMode}
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

