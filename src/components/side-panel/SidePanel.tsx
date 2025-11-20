'use client';

import React from 'react';
import { SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';

const connectors = [
  { id: 'everything-sdk', label: 'Everything SDK' },
  { id: 'local-fs', label: 'Local File System' },
  { id: 'gdrive', label: 'Google Drive (soon)' },
];

const quickFilters = [
  { label: 'Large folders', gradient: 'from-rose-400 to-orange-400' },
  { label: 'Starred', gradient: 'from-amber-400 to-pink-500' },
  { label: 'Recent', gradient: 'from-emerald-400 to-teal-500' },
];

export default function SidePanel() {
  const searchQuery = useFlowStore((state) => state.searchQuery);
  const applySearchQuery = useFlowStore((state) => state.applySearchQuery);
  const activeConnector = useFlowStore((state) => state.activeConnector);
  const setActiveConnector = useFlowStore((state) => state.setActiveConnector);
  const isCollapsed = useFlowStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useFlowStore((state) => state.toggleSidebar);

  return (
    <aside
      className={`relative z-20 flex flex-col gap-6 border-r border-[var(--color-border)] bg-[var(--color-panel)]/90 backdrop-blur-xl px-4 py-6 shadow-[0_15px_45px_rgba(2,6,23,0.45)] transition-all duration-300 ${isCollapsed ? 'w-16 px-2' : 'w-72'
        }`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-lg"
        title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {!isCollapsed ? (
        <>
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Connector
            </p>
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => setActiveConnector(connector.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-sm font-medium transition-all ${activeConnector === connector.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-highlight)] text-[var(--color-accent)] shadow-[0_10px_30px_rgba(56,189,248,0.35)]'
                    : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]/70'
                    }`}
                >
                  {connector.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Search & Highlight
            </p>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => applySearchQuery(e.target.value)}
                placeholder="Jump to folder..."
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-11 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/30"
              />
              <SearchIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--color-text-muted)]" />
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Type to auto-expand branches and spotlight matches.
            </p>
          </div>

          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Quick Filters
            </p>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.label}
                  className={`rounded-full bg-gradient-to-r ${filter.gradient} px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-black/30 opacity-60 cursor-not-allowed`}
                  title="Coming soon"
                  disabled
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto text-xs text-[var(--color-text-muted)]">
            <p className="mb-2 font-semibold tracking-wide text-[var(--color-text)]">
              Flow Status
            </p>
            <ul className="space-y-1">
              <li>• Canvas: Mind-map mode</li>
              <li>• Connectors: {connectors.length} available</li>
              <li>• Effects: Animations enabled</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-6 text-[var(--color-text)]">
          <SearchIcon className="mt-4 h-5 w-5 text-[var(--color-text-muted)]" />
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => setActiveConnector(connector.id)}
              className={`rounded-full p-2 text-xs ${activeConnector === connector.id
                ? 'bg-[var(--color-accent)]/30 text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
                }`}
              title={connector.label}
            >
              {connector.label.slice(0, 1)}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

