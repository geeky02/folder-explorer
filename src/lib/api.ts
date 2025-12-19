// API client for backend communication

import {
  LayoutData,
  SavedLayout,
  LayoutMode,
  EverythingListResponse,
  EverythingSearchResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface DirectoryResponse {
  id: string;
  name: string;
  path: string;
  children: DirectoryResponse[];
  icon: string;
  color: string;
  position: { x: number; y: number };
  modifiedDate?: string | null;
}

export async function fetchDirectory(
  path?: string
): Promise<DirectoryResponse> {
  const url = path
    ? `${API_BASE_URL}/directory?path=${encodeURIComponent(path)}`
    : `${API_BASE_URL}/directory`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch directory structure: ${response.status} ${errorText}`
      );
    }

    return (await response.json()) as DirectoryResponse;
  } catch (error) {
    throw error;
  }
}

export async function listEverythingChildren(
  path?: string,
  limit?: number
): Promise<EverythingListResponse> {
  const params = new URLSearchParams();
  if (path) {
    params.set("path", path);
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const url = `${API_BASE_URL}/connectors/everything/list${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to list Everything folder");
  }
  return (await response.json()) as EverythingListResponse;
}

export async function searchEverything(
  query: string,
  limit?: number
): Promise<EverythingSearchResponse> {
  const params = new URLSearchParams();
  params.set("q", query);
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }

  const response = await fetch(
    `${API_BASE_URL}/connectors/everything/search?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to search Everything");
  }
  return (await response.json()) as EverythingSearchResponse;
}

export async function saveLayout(data: LayoutData): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/save-layout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to save layout");
  }
}

export async function openFolder(folderPath: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/open-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: folderPath }),
  });

  if (!response.ok) {
    throw new Error("Failed to open folder");
  }
}

export async function searchFiles(query: string): Promise<unknown[]> {
  const response = await fetch(
    `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error("Search failed");
  }
  return (await response.json()) as unknown[];
}

export async function getStarredFiles(): Promise<unknown[]> {
  const response = await fetch(`${API_BASE_URL}/starred-files`);
  if (!response.ok) {
    throw new Error("Failed to fetch starred files");
  }
  return (await response.json()) as unknown[];
}

export async function fetchLayouts(): Promise<SavedLayout[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/layouts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch layouts: ${response.status} ${errorText}`
      );
    }

    return (await response.json()) as SavedLayout[];
  } catch (error) {
    throw error;
  }
}

export async function createLayout(payload: {
  name: string;
  mode: LayoutMode;
  nodes: LayoutData["nodes"];
  areas: LayoutData["areas"];
}): Promise<SavedLayout> {
  const response = await fetch(`${API_BASE_URL}/layouts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create layout");
  }
  return (await response.json()) as SavedLayout;
}

export async function getLayout(layoutId: string): Promise<SavedLayout> {
  const response = await fetch(`${API_BASE_URL}/layouts/${layoutId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch layout");
  }
  return (await response.json()) as SavedLayout;
}

export async function deleteLayoutRequest(layoutId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/layouts/${layoutId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete layout");
  }
}

export interface Drive {
  name: string;
  path: string;
  type: "drive" | "folder";
}

export async function fetchDrives(): Promise<Drive[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/drives`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch drives: ${response.status} ${errorText}`
      );
    }

    return (await response.json()) as Drive[];
  } catch (error) {
    throw error;
  }
}
