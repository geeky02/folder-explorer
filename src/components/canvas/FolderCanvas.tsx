'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
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
  Position,
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
  const isDraggingRef = useRef(false);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastDragNodeRef = useRef<Node | null>(null);
  const justFinishedDragRef = useRef(false);

  const highlightedSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds]
  );

  const isEditable = viewMode === 'edit';

  const applyTreeLayout = useCallback((nodes: Node[], edges: any[], preservePositions = true) => {
    if (nodes.length === 0) return nodes;
    if (edges.length === 0) {
      return nodes.map((node, index) => ({
        ...node,
        position: { x: index * 250, y: 100 },
      }));
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const parentToChildren = new Map<string, string[]>(); // parent -> children
    const childToParent = new Map<string, string>(); // child -> parent
    
    edges.forEach(edge => {
      if (!parentToChildren.has(edge.source)) {
        parentToChildren.set(edge.source, []);
      }
      parentToChildren.get(edge.source)!.push(edge.target);
      childToParent.set(edge.target, edge.source);
    });

    const rootNodes = nodes.filter(node => !childToParent.has(node.id));
    
    if (preservePositions) {
      const layoutedNodes = [...nodes];
      
      parentToChildren.forEach((childIds, parentId) => {
        const parent = nodeMap.get(parentId);
        if (!parent || childIds.length === 0) return;

        const children = childIds.map(id => nodeMap.get(id)).filter(Boolean) as Node[];
        if (children.length === 0) return;

        const parentCenterX = parent.position.x + nodeWidth / 2;
        
        const childSpacing = 30;
        const totalChildrenWidth = children.length * nodeWidth + (children.length - 1) * childSpacing;
        const startX = parentCenterX - totalChildrenWidth / 2;

        children.forEach((child, index) => {
          const childX = startX + index * (nodeWidth + childSpacing);
          const childY = parent.position.y + nodeHeight + 40; 
          
          const childNode = layoutedNodes.find(n => n.id === child.id);
          if (childNode) {
            childNode.position = { x: childX, y: childY };
            childNode.targetPosition = Position.Top;
            childNode.sourcePosition = Position.Bottom;
          }
        });
      });

      return layoutedNodes;
    }

    // Fallback: Full Dagre layout (only used on initial load or when nodes are stacked)
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
      rankdir: 'TB',
      align: 'UL',
      nodesep: 30,
      ranksep: 40,
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
        return node;
      }

      const x = nodeWithPosition.x - nodeWidth / 2;
      const y = nodeWithPosition.y - nodeHeight / 2;

      return {
        ...node,
        position: { x, y },
        targetPosition: Position.Top,
        sourcePosition: Position.Bottom,
      };
    });

    parentToChildren.forEach((childIds, parentId) => {
      const parent = nodeMap.get(parentId);
      if (!parent || childIds.length === 0) return;

      const children = childIds.map(id => nodeMap.get(id)).filter(Boolean) as Node[];
      if (children.length === 0) return;

      const parentCenterX = parent.position.x + nodeWidth / 2;
      const childSpacing = 30;
      const totalChildrenWidth = children.length * nodeWidth + (children.length - 1) * childSpacing;
      const startX = parentCenterX - totalChildrenWidth / 2;

      children.forEach((child, index) => {
        const childX = startX + index * (nodeWidth + childSpacing);
        const childY = parent.position.y + nodeHeight + 40;
        
        const childNode = layoutedNodes.find(n => n.id === child.id);
        if (childNode) {
          childNode.position = { x: childX, y: childY };
        }
      });
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
      })));
    };
    const nodeSignature = createNodeSignature(storeNodes);
    const structureChanged = previousStoreNodesRef.current !== nodeSignature;

    const { nodes: rfNodes, edges: rfEdges } = convertToReactFlowNodes(
      storeNodes,
      { highlightedNodeIds: highlightedSet }
    );

    const nodesWithStorePositions = rfNodes.map(rfNode => {
      const storeNode = storeNodes.find(n => n.id === rfNode.id);
      if (storeNode && storeNode.position) {
        if (structureChanged) {
          const wasVisibleBefore = previousStoreNodesRef.current !== '' && 
            previousStoreNodesRef.current.includes(`"id":"${rfNode.id}"`);
          
          if (!wasVisibleBefore) {
            return rfNode;
          }
        }
        
        return {
          ...rfNode,
          position: storeNode.position,
        };
      }
      return rfNode;
    });

    const checkIfStacked = (nodes: Node[]) => {
      if (nodes.length <= 1) return false;
      const positions = nodes.map(n => ({ x: n.position.x, y: n.position.y }));
      const uniquePositions = new Set(positions.map(p => `${Math.round(p.x / 50)}_${Math.round(p.y / 50)}`));
      // If more than 50% of nodes share the same position, they're stacked
      return uniquePositions.size < nodes.length * 0.5;
    };

    const needsLayout = (structureChanged || checkIfStacked(nodesWithStorePositions)) && !isDraggingRef.current && !justFinishedDragRef.current;

    // Apply tree layout when structure changes, nodes are stacked, or on initial load
    if (needsLayout) {
      const preservePositions = !checkIfStacked(nodesWithStorePositions);
      const layoutedNodes = applyTreeLayout(nodesWithStorePositions, rfEdges, preservePositions);
      setNodesState(layoutedNodes);
      setEdgesState(rfEdges);
      
      layoutedNodes.forEach((node) => {
        updateNodePosition(node.id, node.position);
      });
      
      previousStoreNodesRef.current = nodeSignature;

      if (!preservePositions) {
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
  }, [storeNodes, highlightedSet, setNodesState, setEdgesState, applyTreeLayout, updateNodePosition, fitView]);

  // Handle node drag - track dragging state and initial positions
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!isEditable) return;
      
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        lastDragNodeRef.current = node;
        
        const selectedNodes = nodes.filter(n => n.selected);
        
        const nodesToTrack = selectedNodes.length > 1 ? selectedNodes : [node];
        dragStartPositionsRef.current.clear();
        
        nodesToTrack.forEach(n => {
          dragStartPositionsRef.current.set(n.id, { x: n.position.x, y: n.position.y });
        });
      }
      
      lastDragNodeRef.current = node;
    },
    [nodes, isEditable]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (!isEditable) return;
      
      justFinishedDragRef.current = true;
      isDraggingRef.current = false;
      
      requestAnimationFrame(() => {
        setNodesState((currentNodes) => {
          const selectedNodes = currentNodes.filter(n => n.selected);
          
          setTimeout(() => {
            if (selectedNodes.length > 1) {
              selectedNodes.forEach(selectedNode => {
                updateNodePosition(selectedNode.id, selectedNode.position);
              });
            } else {
              updateNodePosition(node.id, node.position);
            }
            
            setTimeout(() => {
              justFinishedDragRef.current = false;
            }, 200);
            
            dragStartPositionsRef.current.clear();
            lastDragNodeRef.current = null;
          }, 0);
          
          return currentNodes;
        });
      });
    },
    [isEditable, updateNodePosition, setNodesState]
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
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--color-border)" />
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

