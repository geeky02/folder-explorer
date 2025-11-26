'use client';

import { useEffect } from 'react';
import FolderCanvas from '@/components/canvas/FolderCanvas';
import Toolbar from '@/components/toolbar/Toolbar';
import SidePanel from '@/components/side-panel/SidePanel';
import { useFlowStore } from '@/store/useFlowStore';

export default function Home() {
  const theme = useFlowStore((state) => state.theme);
  const isSidebarCollapsed = useFlowStore((state) => state.isSidebarCollapsed);
  const syncLayouts = useFlowStore((state) => state.syncLayouts);
  const activeConnector = useFlowStore((state) => state.activeConnector);
  const loadConnectorRoot = useFlowStore((state) => state.loadConnectorRoot);

  // Fetch directory structure from backend
  useEffect(() => {
    loadConnectorRoot(activeConnector);
  }, [activeConnector, loadConnectorRoot]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    syncLayouts();
  }, [syncLayouts]);

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
