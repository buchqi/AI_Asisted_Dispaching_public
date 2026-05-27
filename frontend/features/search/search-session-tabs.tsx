"use client";

import { FreightLoad } from "@/types/load";
import { StreamStatus } from "@/types/realtime";
import { Badge } from "@/components/ui/badge";

// Visual search session tabs; real sessions will come from FastAPI later.
// In production each tab can represent a backend worker/subscription.
const sessions: string[] = [];

// SearchSessionTabs shows active streams and live counters.
// It helps the dispatcher understand which search workers are currently producing loads.
export function SearchSessionTabs({
  status,
  loads
}: {
  status: StreamStatus;
  loads: FreightLoad[];
}) {
  const hotCount = loads.filter((load) => load.hot).length;

  return (
    <div className="flex min-h-11 items-center gap-2 overflow-x-auto border border-white/[0.08] bg-terminal-900/80 px-2 py-2">
      {sessions.map((session, index) => {
        return (
          <button
            key={session}
            onClick={() => {
              // TODO: Select FastAPI-backed search session.
            }}
            className="h-8 shrink-0 border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-slate-400 transition hover:border-cyan-300/25 hover:text-cyan-100"
          >
            {session}
          </button>
        );
      })}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Badge tone={status === "live" ? "green" : status === "degraded" ? "red" : "amber"}>
          {status}
        </Badge>
        <Badge tone="red">{hotCount} hot</Badge>
        <Badge tone="cyan">{loads.length} streaming</Badge>
      </div>
    </div>
  );
}
