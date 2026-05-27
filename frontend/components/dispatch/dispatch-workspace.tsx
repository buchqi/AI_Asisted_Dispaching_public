"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { OperationsShell } from "@/components/layout/operations-shell";
import { mockLoads } from "@/entities/load/mock-loads";
import { FreightLoad } from "@/entities/load/types";
import { MockRealtimeLoadClient, StreamStatus } from "@/websocket/realtime-client";
import { FilterStrip } from "@/components/loads/load-filters";
import { LoadTable } from "@/components/loads/load-table";
import { IntelligenceDrawer } from "@/components/loads/intelligence-drawer";
import { ActivityStream, ActivityItem } from "@/components/notifications/activity-stream";
import { SearchSessionTabs } from "@/components/search/search-session-tabs";
import { useWorkspaceStore } from "@/store/workspace-store";
import { OperationalPage } from "@/components/dispatch/operational-page";
import { readStoredJson, writeStoredJson } from "@/services/storage/persistence";

const dispatchLoadsStorageKey = "freight-command-dispatch-loads";

// DispatchWorkspace is the main product screen.
// It coordinates load data, realtime stream events, selected-row state, and page layout.
export function DispatchWorkspace() {
  // Current table data. For now it starts from mock data and is patched by the mock stream.
  const [loads, setLoads] = useState<FreightLoad[]>(mockLoads);
  const [streamReady, setStreamReady] = useState(false);
  // Stores the latest changed load ID so the table can highlight that row.
  const [changedLoadId, setChangedLoadId] = useState<string | null>(null);
  // Realtime connection status shown in the search session bar.
  const [status, setStatus] = useState<StreamStatus>("connecting");
  // Persistent activity feed items shown in the right stream.
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: "a1", tone: "cyan", text: "Live load stream is ready", at: "now" }
  ]);
  const lastNotificationAtRef = useRef(0);

  const activePage = useWorkspaceStore((state) => state.activePage);
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
  const setActiveLoadDate = useWorkspaceStore((state) => state.setActiveLoadDate);
  const pushNotification = useWorkspaceStore((state) => state.pushNotification);
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

  // Persist the streamed table locally so yesterday's loads remain inspectable
  // until the real backend owns historical storage.
  useEffect(() => {
    if (!streamReady) {
      return;
    }

    writeStoredJson(dispatchLoadsStorageKey, loads.slice(0, 500));
  }, [loads, streamReady]);

  // At midnight, move the active day forward only when the dispatcher is still
  // viewing the current operational day. Manual historical browsing is preserved.
  useEffect(() => {
    const currentDayRef = { value: todayKey() };
    const timer = window.setInterval(() => {
      const nextDay = todayKey();
      if (nextDay !== currentDayRef.value) {
        if (useWorkspaceStore.getState().activeLoadDate === currentDayRef.value) {
          setActiveLoadDate(nextDay);
        }
        currentDayRef.value = nextDay;
      }
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [setActiveLoadDate]);

  // Starts the mock realtime stream when this screen mounts.
  // Later this block can be replaced by a real WebSocket client.
  useEffect(() => {
    if (!streamReady) {
      return;
    }

    const client = new MockRealtimeLoadClient(loads);
    return client.connect((event) => {
      // Status events update UI connection indicators.
      if (event.type === "status") {
        setStatus(event.status);
      }

      // New-load events add a fresh row to the top of the dispatch table.
      // The same load is mirrored into activity and notifications.
      if (event.type === "new-load") {
        setLoads((items) => [event.load, ...items.filter((load) => load.id !== event.load.id)].slice(0, 300));
        setChangedLoadId(event.load.id);
        window.setTimeout(() => setChangedLoadId(null), 1600);
      }

      // Patch events replace existing table data and temporarily mark the changed row.
      if (event.type === "patch") {
        setLoads(event.loads);
        setChangedLoadId(event.changedId);
        window.setTimeout(() => setChangedLoadId(null), 1100);
      }

      // New-load notification events are appended to the activity stream.
      if (event.type === "notification") {
        if (event.priority !== "new-load") {
          return;
        }

        const now = Date.now();
        const notificationCooldownPassed = now - lastNotificationAtRef.current > 2_500;

        if (!notificationCooldownPassed) {
          return;
        }

        lastNotificationAtRef.current = now;
        setActivity((items) => [
          {
            id: crypto.randomUUID(),
            tone: "green",
            text: event.title,
            at: "now"
          },
          ...items.slice(0, 5)
        ]);

        pushNotification({
          title: "New load posted",
          body: event.title,
          priority: "new-load",
          source: "live-loads",
          load: event.load
        });
      }
    });
  }, [pushNotification, streamReady]);

  // Load stored stream data after hydration so server and browser markup match.
  useEffect(() => {
    setLoads(readStoredJson<FreightLoad[]>(dispatchLoadsStorageKey, mockLoads));
    setStreamReady(true);
  }, []);

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
