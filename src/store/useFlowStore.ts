// Zustand store for managing application state

import { create } from "zustand";
import {
  FolderNode,
  Area,
  LayoutMode,
  ViewMode,
  SavedLayout,
  SearchMatch,
  DirectoryResponse,
  EverythingEntry,
  EverythingListResponse,
} from "@/lib/types";
import {
  fetchLayouts,
  createLayout,
  getLayout,
  deleteLayoutRequest,
  fetchDirectory,
  listEverythingChildren,
  searchEverything,
} from "@/lib/api";
import { generateNodeId } from "@/lib/utils";

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
  savedLayouts: SavedLayout[];
  activeLayoutId: string | null;

  // UI State
  layoutMode: LayoutMode;
  viewMode: ViewMode;
  selectedNodeId: string | null;
  selectedAreaId: string | null;
  searchQuery: string;
  highlightedNodeIds: string[];
  searchMatches: SearchMatch[];
  activeSearchIndex: number;
  activeConnector: string;
  layoutRefreshToken: number;
  theme: "light" | "dark";
  isSidebarCollapsed: boolean;

  // Canvas State
  zoom: number;
  pan: { x: number; y: number };
  isLoadingNodes: boolean;
  searchLoading: boolean;

  // Actions
  setNodes: (nodes: FolderNode[]) => void;
  setAreas: (areas: Area[]) => void;
  updateAreaColor: (id: string, color: string) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedAreaId: (id: string | null) => void;
  applySearchQuery: (query: string) => Promise<void>;
  setHighlightedNodeIds: (ids: string[]) => void;
  setActiveConnector: (connector: string) => void;
  refreshLayout: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  saveLayout: (name: string) => Promise<void>;
  loadLayout: (layoutId: string) => Promise<void>;
  deleteLayout: (layoutId: string) => Promise<void>;
  syncLayouts: () => Promise<void>;
  setActiveSearchIndex: (index: number) => void;
  selectNextSearchMatch: () => void;
  selectPrevSearchMatch: () => void;
  focusSearchMatch: (index?: number) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeColor: (id: string, color: string) => void;
  updateNodeIcon: (id: string, icon: string) => void;
  setNodeExpanded: (id: string, expanded: boolean) => void;
  toggleNodeExpanded: (id: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  loadConnectorRoot: (connectorId: string, path?: string) => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  // Initial state
  nodes: [],
  areas: [],
  savedLayouts: [],
  activeLayoutId: null,
  layoutMode: "freeflow",
  viewMode: "view",
  selectedNodeId: null,
  selectedAreaId: null,
  searchQuery: "",
  highlightedNodeIds: [],
  searchMatches: [],
  activeSearchIndex: -1,
  activeConnector: "local-fs",
  layoutRefreshToken: 0,
  theme: "light",
  isSidebarCollapsed: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isLoadingNodes: false,
  searchLoading: false,

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
  applySearchQuery: async (query: string) => {
    const connector = get().activeConnector;
    if (connector === "everything-sdk") {
      const trimmed = query.trim();
      if (!trimmed) {
        set({
          searchQuery: "",
          searchMatches: [],
          highlightedNodeIds: [],
          activeSearchIndex: -1,
          searchLoading: false,
        });
        return;
      }

      set({
        searchQuery: query,
        searchLoading: true,
        activeSearchIndex: -1,
      });

      try {
        const result = await searchEverything(trimmed, 60);
        const matches: SearchMatch[] = result.results.slice(0, 25).map(
          (entry) => ({
            id: entry.path || entry.id || generateNodeId(entry.name),
            name: entry.name,
            path: entry.path || entry.name,
            icon: entry.icon,
            connector: "everything-sdk",
          })
        );

        set({
          searchMatches: matches,
          searchLoading: false,
          activeSearchIndex: matches.length > 0 ? 0 : -1,
        });
      } catch (error) {
        console.error("Everything search failed:", error);
        set({
          searchMatches: [],
          searchLoading: false,
          activeSearchIndex: -1,
        });
      }
      return;
    }

    set({ searchLoading: false });
    set((state) => applySearchQueryToState(state, query));
  },
  setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),
  setActiveConnector: (connector) => set({ activeConnector: connector }),
  refreshLayout: () =>
    set((state) => ({ layoutRefreshToken: state.layoutRefreshToken + 1 })),
  saveLayout: async (name: string) => {
    const state = get();
    const layout = await createLayout({
      name,
      mode: state.layoutMode,
      nodes: state.nodes,
      areas: state.areas,
    });
    set((current) => ({
      savedLayouts: [...current.savedLayouts, layout],
      activeLayoutId: layout.id,
    }));
  },
  loadLayout: async (layoutId: string) => {
    const layout = await getLayout(layoutId);
    set({
      nodes: layout.nodes,
      areas: layout.areas,
      layoutMode: layout.mode,
      activeLayoutId: layout.id,
    });
  },
  deleteLayout: async (layoutId: string) => {
    await deleteLayoutRequest(layoutId);
    set((state) => ({
      savedLayouts: state.savedLayouts.filter((layout) => layout.id !== layoutId),
      activeLayoutId:
        state.activeLayoutId === layoutId ? null : state.activeLayoutId,
    }));
  },
  syncLayouts: async () => {
    const layouts = await fetchLayouts();
    set({ savedLayouts: layouts });
  },
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setActiveSearchIndex: (index) =>
    set((state) => {
      if (state.searchMatches.length === 0) {
        return { activeSearchIndex: -1 };
      }
      const clamped = Math.max(
        0,
        Math.min(index, state.searchMatches.length - 1)
      );
      return { activeSearchIndex: clamped };
    }),
  selectNextSearchMatch: () => {
    const state = get();
    if (state.searchMatches.length === 0) {
      set({ activeSearchIndex: -1 });
      return;
    }
    const next = (state.activeSearchIndex + 1) % state.searchMatches.length;
    set({ activeSearchIndex: next });
  },
  selectPrevSearchMatch: () => {
    const state = get();
    if (state.searchMatches.length === 0) {
      set({ activeSearchIndex: -1 });
      return;
    }
    const prev =
      (state.activeSearchIndex - 1 + state.searchMatches.length) %
      state.searchMatches.length;
    set({ activeSearchIndex: prev });
  },
  focusSearchMatch: (index) =>
    set((state) => {
      if (state.searchMatches.length === 0) {
        return {};
      }
      const targetIndex =
        typeof index === "number"
          ? Math.max(0, Math.min(index, state.searchMatches.length - 1))
          : state.activeSearchIndex;
      if (targetIndex < 0 || targetIndex >= state.searchMatches.length) {
        return {};
      }
      const target = state.searchMatches[targetIndex];
      const existingNode = findNodeById(state.nodes, target.id);

      let nodes = state.nodes;
      if (!existingNode) {
        const newNode = createNodeFromSearchMatch(
          target,
          state.activeConnector
        );
        nodes = [...state.nodes, newNode];
      }

      return {
        nodes,
        selectedNodeId: target.id,
        activeSearchIndex: targetIndex,
      };
    }),
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
  loadConnectorRoot: async (connectorId, path) => {
    set({ isLoadingNodes: true });
    
    // Retry helper function
    const retryFetch = async <T>(
      fn: () => Promise<T>,
      retries = 3,
      delay = 1000
    ): Promise<T> => {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          if (i === retries - 1) throw error;
          console.warn(`Retry ${i + 1}/${retries} after ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      throw new Error('Max retries exceeded');
    };

    try {
      let nodes: FolderNode[] = [];
      if (connectorId === "everything-sdk") {
        try {
          const response = await retryFetch(() => listEverythingChildren(path));
          nodes = [convertEverythingListResponse(response)];
        } catch (everythingError) {
          console.warn("Everything SDK not available, falling back to mock data:", everythingError);
          // Fallback to local-fs mock data
          const directory = await retryFetch(() => fetchDirectory());
          nodes = [convertDirectoryResponse(directory)];
          connectorId = "local-fs";
        }
      } else {
        const directory = await retryFetch(() => fetchDirectory(path));
        nodes = [convertDirectoryResponse(directory)];
      }
      set({
        nodes,
        activeConnector: connectorId,
        isLoadingNodes: false,
      });
    } catch (error) {
      console.error(`Failed to load connector ${connectorId}:`, error);
      // Last resort: try to load mock data with retry
      try {
        const directory = await retryFetch(() => fetchDirectory(), 2, 500);
        const nodes = [convertDirectoryResponse(directory)];
        set({
          nodes,
          activeConnector: "local-fs",
          isLoadingNodes: false,
        });
      } catch (fallbackError) {
        console.error("Failed to load fallback mock data:", fallbackError);
        console.error("Make sure the backend server is running on port 3001");
        set({ nodes: [], isLoadingNodes: false });
      }
    }
  },
}));

function collectMatchingNodes(nodes: FolderNode[], query: string): FolderNode[] {
  const matches: FolderNode[] = [];
  const lower = query.toLowerCase();

  const traverse = (node: FolderNode) => {
    if (node.name.toLowerCase().includes(lower)) {
      matches.push(node);
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
      searchMatches: [],
      activeSearchIndex: -1,
    };
  }

  const matches = collectMatchingNodes(state.nodes, trimmed);
  const matchSet = new Set(matches.map((node) => node.id));

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
    highlightedNodeIds: matches.map((node) => node.id),
    searchMatches: matches.slice(0, 10).map((node) => ({
      id: node.id,
      name: node.name,
      path: node.path,
      icon: node.icon,
    })),
    activeSearchIndex: matches.length > 0 ? 0 : -1,
  };
}

function findNodeById(
  nodes: FolderNode[],
  id: string
): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const match = findNodeById(node.children, id);
      if (match) {
        return match;
      }
    }
  }
  return null;
}

function createNodeFromSearchMatch(
  match: SearchMatch,
  connectorId: string
): FolderNode {
  return {
    id: match.id,
    name: match.name,
    path: match.path,
    icon: match.icon || "folder",
    color: connectorId === "everything-sdk" ? "#e0e0e0" : "#cfd8dc",
    position: { x: 0, y: 0 },
    children: [],
    expanded: false,
    hasChildren: true,
    connector: connectorId,
  };
}

function convertDirectoryResponse(dir: DirectoryResponse): FolderNode {
  return {
    id: dir.id || generateNodeId(dir.path),
    name: dir.name,
    path: dir.path,
    icon: dir.icon || "folder",
    color: dir.color || "#e0e0e0",
    position: dir.position || { x: 0, y: 0 },
    children: dir.children
      ? dir.children.map((child) => convertDirectoryResponse(child))
      : [],
    expanded: true,
    hasChildren: Boolean(dir.children && dir.children.length > 0),
    connector: "local-fs",
  };
}

function convertEverythingEntry(entry: EverythingEntry): FolderNode {
  const nodeId = entry.path || entry.id || generateNodeId(entry.name);
  return {
    id: nodeId,
    name: entry.name,
    path: entry.path || entry.name,
    icon: entry.icon || (entry.type === "folder" ? "folder" : "file"),
    color: entry.type === "folder" ? "#e0e0e0" : "#cfd8dc",
    position: { x: 0, y: 0 },
    children: [],
    expanded: false,
    hasChildren: entry.hasChildren ?? entry.type === "folder",
    connector: "everything-sdk",
  };
}

function convertEverythingListResponse(
  response: EverythingListResponse
): FolderNode {
  return {
    id: response.path || generateNodeId(response.name),
    name: response.name,
    path: response.path,
    icon: "folder",
    color: "#e0e0e0",
    position: { x: 0, y: 0 },
    children: response.children.map((child) => convertEverythingEntry(child)),
    expanded: true,
    hasChildren: true,
    connector: "everything-sdk",
  };
}
