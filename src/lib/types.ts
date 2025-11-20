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
  areaId?: string; // For area grouping
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
  nodes: string[]; // Array of node IDs
  color: string;
  position: Position;
  size: { width: number; height: number };
}

export interface LayoutData {
  nodes: FolderNode[];
  areas: Area[];
  layoutMode: "auto" | "freeflow";
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

export type LayoutMode = "auto" | "freeflow";
export type ViewMode = "view" | "edit";

export interface ContextMenuOption {
  label: string;
  action: () => void;
  icon?: string;
}
