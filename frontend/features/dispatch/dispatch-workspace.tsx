"use client";

import { useEffect } from "react";
import { OperationsShell } from "@/components/layout/operations-shell";
import { OperationalPage } from "@/features/dispatch/operational-page";
import { SearchControlCenter } from "@/features/search/search-control-center";
import { useWorkspaceStore, type WorkspacePage } from "@/store/workspace-store";

// DispatchWorkspace is the active-search control center for the MVP.
// Raw search results stay out of Live Loads until Phase 5B defines result handling.
export function DispatchWorkspace({ initialPage = "dispatch" }: { initialPage?: WorkspacePage }) {
  const activePage = useWorkspaceStore((state) => state.activePage);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);

  useEffect(() => {
    setActivePage(initialPage);
  }, [initialPage, setActivePage]);

  return (
    <OperationsShell>
      {activePage === "dispatch" ? (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-3 p-3 xl:p-4">
          <header className="flex flex-wrap items-center gap-3 border border-white/[0.08] bg-terminal-950/75 p-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-slate-50">Dispatch Workspace</h1>
              <p className="mt-1 text-sm text-slate-500">Start autonomous truck searches and monitor running sessions.</p>
            </div>
          </header>
          <SearchControlCenter />
        </div>
      ) : (
        <OperationalPage page={activePage} />
      )}
    </OperationsShell>
  );
}

