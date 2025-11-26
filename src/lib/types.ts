// Type definitions for Folder Mindmap Tool

export interface Position {
  x: number;
  y: number;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  icon: string;
  color: string;
  position: Position;
  children: FolderNode[];
  expanded?: boolean;
  areaId?: string;
  hasChildren?: boolean;
  connector?: string;
}

export interface FolderNodeVisualData {
  label: string;
  path: string;
  icon: string;
  color: string;
  children?: FolderNode[];
  expanded: boolean;
  childCount: number;
  depth: number;
  isHighlighted?: boolean;
}

export interface Area {
  id: string;
  name: string;
  nodes: string[];
  color: string;
  position: Position;
  size: { width: number; height: number };
}

export interface LayoutData {
  nodes: FolderNode[];
  areas: Area[];
  layoutMode: "auto" | "freeflow";
}

export interface SavedLayout {
  id: string;
  name: string;
  mode: LayoutMode;
  nodes: FolderNode[];
  areas: Area[];
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryResponse {
  id: string;
  name: string;
  path: string;
  children: DirectoryResponse[];
  icon: string;
  color: string;
  position: Position;
}

export interface EverythingEntry {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number | null;
  dateModified: string | number | null;
  icon?: string;
  hasChildren?: boolean;
}

export interface EverythingListResponse {
  path: string;
  name: string;
  total: number;
  children: EverythingEntry[];
}

export interface EverythingSearchResponse {
  query: string;
  totalResults: number;
  results: EverythingEntry[];
}

export type LayoutMode = "auto" | "freeflow";
export type ViewMode = "view" | "edit";

export interface ContextMenuOption {
  label: string;
  action: () => void;
  icon?: string;
}

export interface SearchMatch {
  id: string;
  name: string;
  path: string;
  icon?: string;
  connector?: string;
}
