"use client";

import { FreightLoad } from "@/entities/load/types";
import { StreamStatus } from "@/websocket/realtime-client";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore } from "@/store/workspace-store";

// Mock live search sessions.
// In production each tab can represent a backend worker/subscription.
const sessions = ["Southeast Hot Lanes", "Reefer 500mi", "TX Outbound", "Private Brokers"];

// SearchSessionTabs shows active streams and live counters.
// It helps the dispatcher understand which search workers are currently producing loads.
export function SearchSessionTabs({
  status,
  loads
}: {
  status: StreamStatus;
  loads: FreightLoad[];
}) {
  const activeSearch = useWorkspaceStore((state) => state.activeSearch);
  const setActiveSearch = useWorkspaceStore((state) => state.setActiveSearch);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  // Hot count is derived from the current load list, so it updates with stream patches.
  const hotCount = loads.filter((load) => load.hot).length;

  return (
    <div className="flex min-h-11 items-center gap-2 overflow-x-auto border border-white/[0.08] bg-terminal-900/80 px-2 py-2">
      {sessions.map((session, index) => {
        const active = session === activeSearch;
        return (
          <button
            key={session}
            onClick={() => {
              setActiveSearch(session);
              pushToast({
                title: session,
                body: "Live search session selected.",
                tone: "cyan"
              });
            }}
            className={`h-8 shrink-0 border px-3 text-xs transition ${
              active
                ? "border-violet-300/35 bg-violet-400/15 text-violet-100 shadow-glow"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-cyan-300/25 hover:text-cyan-100"
            }`}
          >
            {session}
            <span className="ml-2 font-mono text-[11px] text-slate-500">{24 + index * 9}</span>
          </button>
        );
      })}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Badge tone={status === "live" ? "green" : status === "offline" ? "red" : "amber"}>
          {status}
        </Badge>
        <Badge tone="red">{hotCount} hot</Badge>
        <Badge tone="cyan">{loads.length} streaming</Badge>
      </div>
    </div>
  );
}
