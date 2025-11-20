// API client for backend communication

import { LayoutData } from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DirectoryResponse {
  id: string;
  name: string;
  path: string;
  children: DirectoryResponse[];
  icon: string;
  color: string;
  position: { x: number; y: number };
}

export async function fetchDirectory(
  path?: string
): Promise<DirectoryResponse> {
  const url = path
    ? `${API_BASE_URL}/directory?path=${encodeURIComponent(path)}`
    : `${API_BASE_URL}/directory`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch directory structure');
  }
  return (await response.json()) as DirectoryResponse;
}

export async function saveLayout(data: LayoutData): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/save-layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to save layout');
  }
}

export async function openFolder(folderPath: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/open-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: folderPath }),
  });

  if (!response.ok) {
    throw new Error('Failed to open folder');
  }
}

export async function searchFiles(query: string): Promise<unknown[]> {
  const response = await fetch(
    `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error('Search failed');
  }
  return (await response.json()) as unknown[];
}

export async function getStarredFiles(): Promise<unknown[]> {
  const response = await fetch(`${API_BASE_URL}/starred-files`);
  if (!response.ok) {
    throw new Error('Failed to fetch starred files');
  }
  return (await response.json()) as unknown[];
}

