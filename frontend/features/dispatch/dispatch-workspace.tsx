"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { OperationsShell } from "@/components/layout/operations-shell";
import { FreightLoad } from "@/types/load";
import { StreamStatus } from "@/types/realtime";
import { FilterStrip } from "@/features/loads/load-filters";
import { LoadTable } from "@/features/loads/load-table";
import { IntelligenceDrawer } from "@/features/loads/intelligence-drawer";
import { ActivityStream, ActivityItem } from "@/features/dispatch/activity-stream";
import { SearchSessionTabs } from "@/features/search/search-session-tabs";
import { useWorkspaceStore, type WorkspacePage } from "@/store/workspace-store";
import { OperationalPage } from "@/features/dispatch/operational-page";

// DispatchWorkspace is the main product screen.
// It coordinates load data, realtime stream events, selected-row state, and page layout.
export function DispatchWorkspace({ initialPage = "dispatch" }: { initialPage?: WorkspacePage }) {
  const [loads] = useState<FreightLoad[]>([]);
  // Stores the latest changed load ID so the table can highlight that row.
  const [changedLoadId, setChangedLoadId] = useState<string | null>(null);
  // Realtime connection status shown in the search session bar.
  const [status] = useState<StreamStatus>("idle");
  // Persistent activity feed items shown in the right stream.
  const [activity] = useState<ActivityItem[]>([]);

  const activePage = useWorkspaceStore((state) => state.activePage);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const laneFilter = useWorkspaceStore((state) => state.laneFilter);
  const equipmentFilter = useWorkspaceStore((state) => state.equipmentFilter);
  const minRpm = useWorkspaceStore((state) => state.minRpm);
  const maxDeadhead = useWorkspaceStore((state) => state.maxDeadhead);
  const minBrokerScore = useWorkspaceStore((state) => state.minBrokerScore);
  const maxWeight = useWorkspaceStore((state) => state.maxWeight);
  const activeLoadDate = useWorkspaceStore((state) => state.activeLoadDate);
  const decisionFilter = useWorkspaceStore((state) => state.decisionFilter);
  const loadDecisions = useWorkspaceStore((state) => state.loadDecisions);
  // The selected row ID lives in Zustand because multiple components need it.
  const selectedLoadId = useWorkspaceStore((state) => state.selectedLoadId);
  // Convert selected ID into the full load object for the drawer.
  const selectedLoad = useMemo(() => loads.find((load) => load.id === selectedLoadId) ?? null, [loads, selectedLoadId]);
  const visibleLoads = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();

    return loads.filter((load) => {
      const matchesQuery =
        query.length === 0 ||
        [load.id, load.pickup, load.delivery, load.broker, load.company, load.phone, load.equipment, load.source, load.dispatcher]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesLane = laneFilter === "All" || laneMatchesFilter(load, laneFilter);
      const matchesEquipment = equipmentFilter === "All" || load.equipment === equipmentFilter;
      const matchesBrokerScore = brokerScore(load.broker) >= minBrokerScore;
      const matchesDate = loadDateKey(load.receivedAt ?? load.updatedAt) === activeLoadDate;
      const decision = loadDecisions[load.id]?.status ?? "new";
      const matchesDecision = decisionFilter === "All" || decisionFilter === decision;

      return matchesQuery && matchesLane && matchesEquipment && matchesBrokerScore && matchesDate && matchesDecision && load.rpm >= minRpm && load.deadhead <= maxDeadhead && load.weight <= maxWeight;
    });
  }, [activeLoadDate, decisionFilter, equipmentFilter, globalSearch, laneFilter, loadDecisions, loads, maxDeadhead, maxWeight, minBrokerScore, minRpm]);

  useEffect(() => {
    setActivePage(initialPage);
  }, [initialPage, setActivePage]);

  return (
    <OperationsShell>
      {activePage === "dispatch" ? (
        <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-3 p-3 xl:p-4">
          <SearchSessionTabs status={status} loads={visibleLoads} />
          <FilterStrip />
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <LoadTable loads={visibleLoads} changedLoadId={changedLoadId} />
            <ActivityStream items={activity} />
          </div>
        </div>
      ) : (
        <OperationalPage page={activePage} />
      )}
      <AnimatePresence>{selectedLoad ? <IntelligenceDrawer load={selectedLoad} /> : null}</AnimatePresence>
    </OperationsShell>
  );
}

function laneMatchesFilter(load: FreightLoad, lane: string) {
  const text = `${load.pickup} ${load.delivery}`;

  if (lane === "Southeast") {
    return /(GA|SC|NC|TN|FL|AL)/.test(text);
  }
  if (lane === "TX Outbound") {
    return load.pickup.includes("TX");
  }
  if (lane === "Midwest") {
    return /(IL|OH|MO|KS)/.test(text);
  }
  if (lane === "East Coast") {
    return /(PA|NC|SC|GA|FL)/.test(text);
  }
  if (lane === "West Coast") {
    return /(AZ|NV|CA|WA|OR|CO)/.test(text);
  }

  return true;
}

function brokerScore(broker: string) {
  const scores: Record<string, number> = {
    "Apex Freight": 72,
    "BlueLine Logistics": 76,
    "Northstar Brokers": 80,
    "Vector Load Group": 84,
    "Summit Transit": 88,
    "Cobalt Freight": 92
  };

  return scores[broker] ?? 75;
}

function loadDateKey(value: number) {
  return new Date(value).toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
