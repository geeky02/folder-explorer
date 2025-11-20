// Zustand store for managing application state

import { create } from "zustand";
import { FolderNode, Area, LayoutMode, ViewMode } from "@/lib/types";

type NodeUpdater = (node: FolderNode) => FolderNode;

function updateNodeInTree(
  nodes: FolderNode[],
  id: string,
  updater: NodeUpdater
): { nodes: FolderNode[]; changed: boolean } {
  let changed = false;

  const updatedNodes = nodes.map((node) => {
    if (node.id === id) {
      changed = true;
      return updater(node);
    }

    if (node.children && node.children.length > 0) {
      const { nodes: updatedChildren, changed: childChanged } =
        updateNodeInTree(node.children, id, updater);

      if (childChanged) {
        changed = true;
        return {
          ...node,
          children: updatedChildren,
        };
      }
    }

    return node;
  });

  return {
    nodes: changed ? updatedNodes : nodes,
    changed,
  };
}

function setExpandedForTree(
  nodes: FolderNode[],
  expanded: boolean,
  depth = 0
): FolderNode[] {
  return nodes.map((node) => ({
    ...node,
    expanded: depth === 0 ? true : expanded,
    children: node.children
      ? setExpandedForTree(node.children, expanded, depth + 1)
      : [],
  }));
}

interface FlowState {
  // Data
  nodes: FolderNode[];
  areas: Area[];

  // UI State
  layoutMode: LayoutMode;
  viewMode: ViewMode;
  selectedNodeId: string | null;
  selectedAreaId: string | null;
  searchQuery: string;
  highlightedNodeIds: string[];
  activeConnector: string;
  layoutRefreshToken: number;
  theme: "light" | "dark";
  isSidebarCollapsed: boolean;

  // Canvas State
  zoom: number;
  pan: { x: number; y: number };

  // Actions
  setNodes: (nodes: FolderNode[]) => void;
  setAreas: (areas: Area[]) => void;
  updateAreaColor: (id: string, color: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedAreaId: (id: string | null) => void;
  applySearchQuery: (query: string) => void;
  setHighlightedNodeIds: (ids: string[]) => void;
  setActiveConnector: (connector: string) => void;
  refreshLayout: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeColor: (id: string, color: string) => void;
  updateNodeIcon: (id: string, icon: string) => void;
  setNodeExpanded: (id: string, expanded: boolean) => void;
  toggleNodeExpanded: (id: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
}

export const useFlowStore = create<FlowState>((set) => ({
  // Initial state
  nodes: [],
  areas: [],
  layoutMode: "auto",
  viewMode: "view",
  selectedNodeId: null,
  selectedAreaId: null,
  searchQuery: "",
  highlightedNodeIds: [],
  activeConnector: "everything-sdk",
  layoutRefreshToken: 0,
  theme: "dark",
  isSidebarCollapsed: false,
  zoom: 1,
  pan: { x: 0, y: 0 },

  // Actions
  setNodes: (nodes) => set({ nodes }),
  setAreas: (areas) => set({ areas }),
  updateAreaColor: (id, color) =>
    set((state) => ({
      areas: state.areas.map((area) =>
        area.id === id ? { ...area, color } : area
      ),
    })),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setSelectedAreaId: (id) => set({ selectedAreaId: id }),
  applySearchQuery: (query) =>
    set((state) => applySearchQueryToState(state, query)),
  setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),
  setActiveConnector: (connector) => set({ activeConnector: connector }),
  refreshLayout: () =>
    set((state) => ({ layoutRefreshToken: state.layoutRefreshToken + 1 })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  updateNodePosition: (id, position) =>
    set((state) => {
      const { nodes } = updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        position,
      }));
      return { nodes };
    }),
  updateNodeColor: (id, color) =>
    set((state) => {
      const { nodes } = updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        color,
      }));
      return { nodes };
    }),
  updateNodeIcon: (id, icon) =>
    set((state) => {
      const { nodes } = updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        icon,
      }));
      return { nodes };
    }),
  setNodeExpanded: (id, expanded) =>
    set((state) => {
      const { nodes } = updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        expanded,
      }));
      return { nodes };
    }),
  toggleNodeExpanded: (id) =>
    set((state) => {
      const { nodes } = updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        expanded: !node.expanded,
      }));
      return { nodes };
    }),
  expandAllNodes: () =>
    set((state) => ({
      nodes: setExpandedForTree(state.nodes, true),
    })),
  collapseAllNodes: () =>
    set((state) => ({
      nodes: setExpandedForTree(state.nodes, false),
    })),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),
}));

function collectMatchingNodeIds(nodes: FolderNode[], query: string): string[] {
  const matches: string[] = [];
  const lower = query.toLowerCase();

  const traverse = (node: FolderNode) => {
    if (node.name.toLowerCase().includes(lower)) {
      matches.push(node.id);
    }
    node.children?.forEach(traverse);
  };

  nodes.forEach(traverse);
  return matches;
}

function expandNodesForMatches(
  nodes: FolderNode[],
  matchSet: Set<string>
): { nodes: FolderNode[]; hasMatch: boolean } {
  let hasAnyMatch = false;

  const updatedNodes = nodes.map((node) => {
    let childResult = { nodes: node.children ?? [], hasMatch: false };
    if (node.children && node.children.length > 0) {
      childResult = expandNodesForMatches(node.children, matchSet);
    }

    const nodeMatches = matchSet.has(node.id);
    const subtreeMatches = nodeMatches || childResult.hasMatch;
    if (subtreeMatches) {
      hasAnyMatch = true;
      return {
        ...node,
        expanded:
          node.children && node.children.length > 0 ? true : node.expanded,
        children: childResult.nodes,
      };
    }

    if (childResult.hasMatch) {
      hasAnyMatch = true;
      return {
        ...node,
        children: childResult.nodes,
      };
    }

    return node;
  });

  return { nodes: updatedNodes, hasMatch: hasAnyMatch };
}

function applySearchQueryToState(state: FlowState, query: string) {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      searchQuery: "",
      highlightedNodeIds: [],
    };
  }

  const matches = collectMatchingNodeIds(state.nodes, trimmed);
  const matchSet = new Set(matches);

  let nodes = state.nodes;
  if (matches.length > 0) {
    const { nodes: expandedNodes } = expandNodesForMatches(
      state.nodes,
      matchSet
    );
    nodes = expandedNodes;
  }

  return {
    nodes,
    searchQuery: query,
    highlightedNodeIds: matches,
  };
}
