'use client';

import { useEffect } from 'react';
import FolderCanvas from '@/components/canvas/FolderCanvas';
import Toolbar from '@/components/toolbar/Toolbar';
import SidePanel from '@/components/side-panel/SidePanel';
import { useFlowStore } from '@/store/useFlowStore';
import { FolderNode, DirectoryResponse } from '@/lib/types';
import { generateNodeId } from '@/lib/utils';

export default function Home() {
  const setNodes = useFlowStore((state) => state.setNodes);
  const theme = useFlowStore((state) => state.theme);
  const isSidebarCollapsed = useFlowStore((state) => state.isSidebarCollapsed);

  // Fetch directory structure from backend
  useEffect(() => {
    const fetchDirectoryStructure = async () => {
      try {
        const response = await fetch('http://localhost:3001/directory');
        if (!response.ok) {
          throw new Error('Failed to fetch directory structure');
        }
        const data: DirectoryResponse = await response.json();
        
        // Convert DirectoryResponse to FolderNode format
        const convertToFolderNodes = (
          dir: DirectoryResponse
        ): FolderNode => {
          return {
            id: dir.id || generateNodeId(dir.path),
            name: dir.name,
            path: dir.path,
            icon: dir.icon || 'folder',
            color: dir.color || '#e0e0e0',
            position: dir.position || { x: 0, y: 0 },
            children: dir.children
              ? dir.children.map((child) => convertToFolderNodes(child))
              : [],
            expanded: true,
          };
        };

        const folderNodes = convertToFolderNodes(data);
        setNodes([folderNodes]);
      } catch (error) {
        console.error('Error fetching directory structure:', error);
        // Fallback to empty state or show error message
      }
    };

    fetchDirectoryStructure();
  }, [setNodes]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-app-bg)] text-[var(--color-text)]">
      <SidePanel />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          isSidebarCollapsed ? 'pl-2' : 'pl-0'
        }`}
      >
        <Toolbar />
        <div className="relative flex-1">
          <FolderCanvas className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
