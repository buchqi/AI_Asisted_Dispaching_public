"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  MapPin,
  Pause,
  PhoneCall,
  Play,
  Plus,
  Route,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRoundCheck,
  X
} from "lucide-react";
import { mockBrokerProfiles, mockLoads } from "@/entities/load/mock-loads";
import { FreightLoad } from "@/entities/load/types";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { readStoredJson, writeStoredJson } from "@/services/storage/persistence";
import { cn, formatCurrency } from "@/shared/lib/utils";
import { useWorkspaceStore, type WorkspacePage } from "@/store/workspace-store";

type Tone = "green" | "cyan" | "amber" | "red" | "violet" | "slate";

type SearchSession = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  equipment: string;
  minRpm: number;
  status: "running" | "paused" | "queued";
  createdAt?: number;
};

type TruckUnit = {
  id: string;
  equipment: string;
  location: string;
  status: "available" | "loaded" | "service";
  driver: string;
  trackerState?: "moving" | "stopped";
  trackerCity?: string;
  trackerStateCode?: string;
  trackerNote?: string;
  trackerUpdatedAt?: number;
};

type DriverUnit = {
  name: string;
  phone: string;
  email: string;
  license: string;
  location: string;
  homeTerminal: string;
  status: "available" | "driving" | "calling" | "off";
  truck: string;
  loadsToday: number;
  completedToday: number;
  weeklyLoads: number;
  onTimeRate: number;
  avgRpm: number;
};

type DriverDraft = {
  name: string;
  phone: string;
  email: string;
  license: string;
  location: string;
  homeTerminal: string;
};

type TruckDraft = {
  id: string;
  equipment: string;
  location: string;
};

type TrackerDraft = {
  trackerState: "moving" | "stopped";
  trackerCity: string;
  trackerStateCode: string;
  trackerNote: string;
};

type SearchCenterResult = {
  id: string;
  title: string;
  body: string;
  type: string;
  tone: Tone;
  page: WorkspacePage;
  query: string;
  loadId?: string;
};

type LoadAssignment = {
  id: string;
  loadId: string;
  driverName: string;
  assignedAt: number;
  status: "assigned" | "completed";
  completedAt?: number;
  score?: number;
  dispatcherComment?: string;
  driverComment?: string;
  issueLevel?: "none" | "minor" | "major";
  detentionMinutes?: number;
  proofNumber?: string;
};

type CompletionDraft = {
  score: string;
  dispatcherComment: string;
  driverComment: string;
  issueLevel: "none" | "minor" | "major";
  detentionMinutes: string;
  proofNumber: string;
};

type BrokerWorkflow = {
  watchedBrokerIds: string[];
  calledBrokerIds: string[];
  notesByBroker: Record<string, string[]>;
};

const initialSessions: SearchSession[] = [
  { id: "S-101", name: "Southeast Hot Lanes", origin: "GA / SC / NC", destination: "TN / FL", equipment: "Dry Van", minRpm: 2.45, status: "running" },
  { id: "S-102", name: "TX Outbound", origin: "Dallas, TX", destination: "Midwest", equipment: "Reefer", minRpm: 2.6, status: "running" },
  { id: "S-103", name: "Private Brokers", origin: "Any", destination: "Any", equipment: "Van/Reefer", minRpm: 2.35, status: "paused" }
];

const initialTrucks: TruckUnit[] = [
  { id: "Unit 204", equipment: "Dry Van", location: "Atlanta, GA", status: "available", driver: "M. Carter", trackerState: "stopped", trackerCity: "Atlanta", trackerStateCode: "GA", trackerNote: "At Atlanta Yard", trackerUpdatedAt: Date.now() - 18 * 60_000 },
  { id: "Unit 318", equipment: "Reefer", location: "Dallas, TX", status: "loaded", driver: "N. Patel", trackerState: "moving", trackerCity: "Little Rock", trackerStateCode: "AR", trackerNote: "I-40 eastbound", trackerUpdatedAt: Date.now() - 7 * 60_000 },
  { id: "Unit 077", equipment: "Flatbed", location: "Chicago, IL", status: "service", driver: "D. Walker", trackerState: "stopped", trackerCity: "Chicago", trackerStateCode: "IL", trackerNote: "Maintenance stop", trackerUpdatedAt: Date.now() - 42 * 60_000 },
  { id: "Unit 441", equipment: "Power Only", location: "Memphis, TN", status: "available", driver: "A. Ramos", trackerState: "moving", trackerCity: "Memphis", trackerStateCode: "TN", trackerNote: "Returning empty", trackerUpdatedAt: Date.now() - 12 * 60_000 }
];

const initialDrivers: DriverUnit[] = [
  { name: "M. Carter", phone: "(404) 555-0194", email: "m.carter@fleet.local", license: "GA-CDL-8841", location: "Atlanta, GA", homeTerminal: "Atlanta Yard", status: "available", truck: "Unit 204", loadsToday: 2, completedToday: 1, weeklyLoads: 9, onTimeRate: 96, avgRpm: 2.62 },
  { name: "N. Patel", phone: "(214) 555-0148", email: "n.patel@fleet.local", license: "TX-CDL-2918", location: "Dallas, TX", homeTerminal: "Dallas Hub", status: "driving", truck: "Unit 318", loadsToday: 3, completedToday: 2, weeklyLoads: 11, onTimeRate: 93, avgRpm: 2.74 },
  { name: "D. Walker", phone: "(312) 555-0177", email: "d.walker@fleet.local", license: "IL-CDL-7710", location: "Chicago, IL", homeTerminal: "Chicago Lot", status: "calling", truck: "Unit 077", loadsToday: 1, completedToday: 1, weeklyLoads: 7, onTimeRate: 89, avgRpm: 2.48 },
  { name: "A. Ramos", phone: "(602) 555-0162", email: "a.ramos@fleet.local", license: "AZ-CDL-4402", location: "Phoenix, AZ", homeTerminal: "Phoenix Yard", status: "available", truck: "Unit 441", loadsToday: 2, completedToday: 2, weeklyLoads: 10, onTimeRate: 98, avgRpm: 2.81 }
];

const companies = [
  { name: "Summit Transit LLC", type: "Carrier", verified: true, contacts: 4, risk: "low" },
  { name: "Cobalt Freight LLC", type: "Broker", verified: true, contacts: 7, risk: "low" },
  { name: "Apex Freight LLC", type: "Broker", verified: false, contacts: 5, risk: "review" },
  { name: "Northstar Brokers LLC", type: "Broker", verified: true, contacts: 3, risk: "medium" }
];

const settingDefaults = {
  denseTable: true,
  soundHooks: false,
  autoOpenHotLoads: false,
  persistLayout: true,
  keyboardHints: true
};

const sessionStorageKey = "freight-command-search-sessions";
const brokerWorkflowStorageKey = "freight-command-broker-workflow";
const companiesStorageKey = "freight-command-companies";
const trucksStorageKey = "freight-command-trucks";
const driversStorageKey = "freight-command-drivers";
const assignmentsStorageKey = "freight-command-load-assignments";

const brokerWorkflowDefaults: BrokerWorkflow = {
  watchedBrokerIds: [],
  calledBrokerIds: [],
  notesByBroker: {}
};

const emptyDriverDraft: DriverDraft = {
  name: "",
  phone: "",
  email: "",
  license: "",
  location: "",
  homeTerminal: ""
};

const emptyTruckDraft: TruckDraft = {
  id: "",
  equipment: "Dry Van",
  location: ""
};

const emptyTrackerDraft: TrackerDraft = {
  trackerState: "moving",
  trackerCity: "",
  trackerStateCode: "",
  trackerNote: ""
};

// OperationalPage delegates every sidebar destination to an individual mock workflow.
// This keeps frontend navigation real while we are still working without backend data.
export function OperationalPage({ page }: { page: Exclude<WorkspacePage, "dispatch"> }) {
  switch (page) {
    case "live-loads":
      return <LiveLoadsPage />;
    case "assignments":
      return <AssignmentsPage />;
    case "search-sessions":
      return <SearchSessionsPage />;
    case "brokers":
      return <BrokersPage />;
    case "companies":
      return <CompaniesPage />;
    case "trucks":
      return <TrucksPage />;
    case "drivers":
      return <DriversPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "notifications":
      return <NotificationsPage />;
    case "settings":
      return <SettingsPage />;
  }
}

function PageFrame({
  title,
  subtitle,
  icon: Icon,
  stats,
  children,
  actions
}: {
  title: string;
  subtitle: string;
  icon: typeof Route;
  stats: Array<{ label: string; value: string; tone: Tone }>;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto p-3 xl:p-4">
      <section className="min-h-full border border-white/[0.08] bg-terminal-950/75">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.08] p-4">
          <div className="grid h-11 w-11 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-slate-50">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {actions}
        </header>

        <div className="grid gap-3 p-4 lg:grid-cols-3">
          {stats.map((stat) => (
            <MetricCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="p-4 pt-0">{children}</div>
      </section>
    </div>
  );
}

export function LiveLoadsPage() {
  const loadDecisions = useWorkspaceStore((state) => state.loadDecisions);
  const focusedLoadId = useWorkspaceStore((state) => state.focusedLoadId);
  const clearFocusedLoad = useWorkspaceStore((state) => state.clearFocusedLoad);
  const claimedLoadIds = useWorkspaceStore((state) => state.claimedLoadIds);
  const watchedLoadIds = useWorkspaceStore((state) => state.watchedLoadIds);
  const hiddenLoadIds = useWorkspaceStore((state) => state.hiddenLoadIds);
  const calledLoadIds = useWorkspaceStore((state) => state.calledLoadIds);
  const claimLoad = useWorkspaceStore((state) => state.claimLoad);
  const watchLoad = useWorkspaceStore((state) => state.watchLoad);
  const hideLoad = useWorkspaceStore((state) => state.hideLoad);
  const restoreHiddenLoads = useWorkspaceStore((state) => state.restoreHiddenLoads);
  const markLoadCalled = useWorkspaceStore((state) => state.markLoadCalled);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [hotOnly, setHotOnly] = useState(false);
  const acceptedLoads = useMemo(
    () => Object.values(loadDecisions).filter((decision) => decision.status === "accepted").map((decision) => decision.load),
    [loadDecisions]
  );
  const [selectedLoad, setSelectedLoad] = useState<FreightLoad | null>(acceptedLoads[0] ?? null);
  const [drivers, setDrivers] = useState(() => readStoredJson<DriverUnit[]>(driversStorageKey, initialDrivers));
  const [assignments, setAssignments] = useState(() => readStoredJson<LoadAssignment[]>(assignmentsStorageKey, []));
  const [selectedDriverName, setSelectedDriverName] = useState(drivers[0]?.name ?? "");
  const [completionLoad, setCompletionLoad] = useState<FreightLoad | null>(null);
  const [completionDraft, setCompletionDraft] = useState<CompletionDraft>({
    score: "5",
    dispatcherComment: "",
    driverComment: "",
    issueLevel: "none",
    detentionMinutes: "0",
    proofNumber: ""
  });
  const [completionError, setCompletionError] = useState("");
  const sources = ["All", "DAT", "Truckstop", "Direct", "Email", "Private"];
  const statuses = ["All", "new", "claimed", "watching", "assigned", "completed"];
  const assignmentByLoadId = useMemo(() => new Map(assignments.map((assignment) => [assignment.loadId, assignment])), [assignments]);
  const selectedAssignment = selectedLoad ? assignments.find((assignment) => assignment.loadId === selectedLoad.id) : undefined;
  const visibleLoads = useMemo(
    () =>
      acceptedLoads
        .filter((load) => !hiddenLoadIds.includes(load.id))
        .filter((load) => source === "All" || load.source === source)
        .filter((load) => {
          if (statusFilter === "All") {
            return true;
          }
          const assignment = assignmentByLoadId.get(load.id);
          if (statusFilter === "assigned" || statusFilter === "completed") {
            return assignment?.status === statusFilter;
          }
          return load.status === statusFilter;
        })
        .filter((load) => !hotOnly || load.hot)
        .filter((load) => [load.pickup, load.delivery, load.broker, load.company, load.id].join(" ").toLowerCase().includes(query.toLowerCase()))
        .slice(0, 18),
    [acceptedLoads, assignmentByLoadId, hiddenLoadIds, hotOnly, query, source, statusFilter]
  );

  useEffect(() => {
    if (selectedLoad && acceptedLoads.some((load) => load.id === selectedLoad.id)) {
      return;
    }
    setSelectedLoad(acceptedLoads[0] ?? null);
  }, [acceptedLoads, selectedLoad]);

  useEffect(() => {
    if (!focusedLoadId) {
      return;
    }

    const focused = acceptedLoads.find((load) => load.id === focusedLoadId);
    if (focused) {
      setSelectedLoad(focused);
      setQuery(focused.id);
    }
    clearFocusedLoad();
  }, [acceptedLoads, clearFocusedLoad, focusedLoadId]);

  useEffect(() => {
    writeStoredJson(assignmentsStorageKey, assignments);
  }, [assignments]);

  useEffect(() => {
    writeStoredJson(driversStorageKey, drivers);
  }, [drivers]);

  const assignSelectedLoad = () => {
    if (!selectedDriverName) {
      return;
    }

    if (!selectedLoad) {
      return;
    }

    setAssignments((items) => {
      const existing = items.find((item) => item.loadId === selectedLoad.id);
      const nextAssignment: LoadAssignment = {
        id: existing?.id ?? `A-${Date.now()}`,
        loadId: selectedLoad.id,
        driverName: selectedDriverName,
        assignedAt: existing?.assignedAt ?? Date.now(),
        status: "assigned"
      };

      return existing
        ? items.map((item) => (item.loadId === selectedLoad.id ? nextAssignment : item))
        : [nextAssignment, ...items];
    });
    setDrivers((items) => items.map((driver) => (driver.name === selectedDriverName ? { ...driver, status: "driving" } : driver)));
    claimLoad(selectedLoad.id);
  };

  const openCompletionForm = () => {
    if (!selectedLoad) {
      return;
    }

    const assignment = assignments.find((item) => item.loadId === selectedLoad.id);
    if (!assignment) {
      setCompletionError("Assign a driver before completing this load.");
      return;
    }

    setCompletionError("");
    setCompletionDraft({
      score: assignment?.score ? String(assignment.score) : "5",
      dispatcherComment: assignment?.dispatcherComment ?? "",
      driverComment: assignment?.driverComment ?? "",
      issueLevel: assignment?.issueLevel ?? "none",
      detentionMinutes: String(assignment?.detentionMinutes ?? 0),
      proofNumber: assignment?.proofNumber ?? ""
    });
    setCompletionLoad(selectedLoad);
  };

  const saveCompletion = () => {
    if (!completionLoad) {
      return;
    }

    const completedAssignment = assignments.find((item) => item.loadId === completionLoad.id);
    const score = Number(completionDraft.score);

    if (!completedAssignment) {
      setCompletionError("This load has no assigned driver.");
      return;
    }
    if (!score || score < 1 || score > 5) {
      setCompletionError("Score must be between 1 and 5.");
      return;
    }
    if (!completionDraft.proofNumber.trim()) {
      setCompletionError("POD / proof number is required before completion.");
      return;
    }
    if (completionDraft.issueLevel === "major" && !completionDraft.dispatcherComment.trim()) {
      setCompletionError("Major issue requires a dispatcher comment.");
      return;
    }

    setAssignments((items) =>
      items.map((item) =>
        item.loadId === completionLoad.id
          ? {
              ...item,
              status: "completed",
              completedAt: Date.now(),
              score,
              dispatcherComment: completionDraft.dispatcherComment.trim(),
              driverComment: completionDraft.driverComment.trim(),
              issueLevel: completionDraft.issueLevel,
              detentionMinutes: Math.max(0, Number(completionDraft.detentionMinutes) || 0),
              proofNumber: completionDraft.proofNumber.trim()
            }
          : item
      )
    );
    if (completedAssignment) {
      setDrivers((items) => items.map((driver) => (driver.name === completedAssignment.driverName ? { ...driver, status: "available" } : driver)));
    }
    setCompletionError("");
    setCompletionLoad(null);
  };

  return (
    <PageFrame
      title="Live Loads"
      subtitle="Source-level feed control, hot load review, and load detail preview."
      icon={Route}
      stats={[
        { label: "Visible", value: String(visibleLoads.length), tone: "cyan" },
        { label: "Hot", value: String(visibleLoads.filter((load) => load.hot).length), tone: "red" },
        { label: "Avg RPM", value: `$${average(visibleLoads.map((load) => load.rpm)).toFixed(2)}`, tone: "green" }
      ]}
      actions={
        <div className="flex gap-2">
          <IconButton label="Show only hot loads" onClick={() => setHotOnly((value) => !value)} className={hotOnly ? "border-red-300/40 bg-red-400/15 text-red-100" : undefined}>
            <CircleDot className="h-4 w-4" />
          </IconButton>
          <IconButton label="Restore hidden loads" onClick={restoreHiddenLoads}>
            <Play className="h-4 w-4" />
          </IconButton>
        </div>
      }
    >
      <ToolbarSearch query={query} onQueryChange={setQuery} placeholder="Search pickup, delivery, broker, load ID..." />
      <SegmentedControl values={sources} active={source} onChange={setSource} className="mt-3" />
      <SegmentedControl values={statuses} active={statusFilter} onChange={setStatusFilter} className="mt-3" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden border border-white/[0.08] bg-white/[0.025]">
          <DataHeader columns="grid-cols-[120px_1fr_1fr_90px_90px_120px_120px]" labels={["Load", "Pickup", "Delivery", "RPM", "Rate", "Broker", "State"]} />
          {visibleLoads.length === 0 ? (
            <div className="p-5 text-sm text-slate-500">No accepted loads yet. Accept a load from Dispatch Workspace to move it here.</div>
          ) : null}
          {visibleLoads.map((load) => {
            const assignment = assignmentByLoadId.get(load.id);

            return (
              <button
                key={load.id}
                type="button"
                onClick={() => setSelectedLoad(load)}
                className={cn("grid w-full grid-cols-[120px_1fr_1fr_90px_90px_120px_120px] items-center border-b border-white/[0.06] px-3 py-3 text-left text-sm text-slate-300 hover:bg-cyan-300/[0.06]", selectedLoad?.id === load.id && "bg-violet-400/[0.09]")}
              >
                <span className="font-mono text-cyan-200">{load.id}</span>
                <span className="truncate">{load.pickup}</span>
                <span className="truncate">{load.delivery}</span>
                <span className="font-mono text-emerald-300">${load.rpm.toFixed(2)}</span>
                <span className="font-mono">{formatCurrency(load.rate)}</span>
                <span className="truncate">{load.broker}</span>
                <span className="flex flex-wrap gap-1">
                  {assignment?.status === "completed" ? <Badge tone="green">completed</Badge> : null}
                  {assignment?.status === "assigned" ? <Badge tone="amber">assigned</Badge> : null}
                  {claimedLoadIds.includes(load.id) ? <Badge tone="green">claimed</Badge> : null}
                  {watchedLoadIds.includes(load.id) ? <Badge tone="violet">watch</Badge> : null}
                  {calledLoadIds.includes(load.id) ? <Badge tone="cyan">called</Badge> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {selectedLoad ? (
            <>
              <DetailPanel
                title={selectedLoad.id}
                rows={[
                  ["Lane", `${selectedLoad.pickup} -> ${selectedLoad.delivery}`],
                  ["Broker", selectedLoad.broker],
                  ["Broker phone", selectedLoad.phone],
                  ["Equipment", selectedLoad.equipment],
                  ["Deadhead", `${selectedLoad.deadhead} mi`],
                  ["AI Score", String(selectedLoad.aiScore)],
                  ["Assigned driver", selectedAssignment?.driverName ?? "Not assigned"],
                  ["Assignment", selectedAssignment?.status ?? "open"],
                  ["Workflow", loadWorkflowLabel(selectedLoad.id, claimedLoadIds, watchedLoadIds, calledLoadIds, selectedAssignment)]
                ]}
                actions={[
                  claimedLoadIds.includes(selectedLoad.id) ? "Already claimed" : "Claim load",
                  calledLoadIds.includes(selectedLoad.id) ? "Broker called" : "Call broker",
                  watchedLoadIds.includes(selectedLoad.id) ? "Unwatch load" : "Watch load",
                  "Hide load"
                ]}
                onAction={(action) => {
                  if (action === "Claim load") {
                    claimLoad(selectedLoad.id);
                  }
                  if (action === "Call broker") {
                    markLoadCalled(selectedLoad.id);
                  }
                  if (action === "Watch load" || action === "Unwatch load") {
                    watchLoad(selectedLoad.id);
                  }
                  if (action === "Hide load") {
                    hideLoad(selectedLoad.id);
                  }
                }}
              />
              <LoadAssignmentPanel
                assignment={selectedAssignment}
                drivers={drivers}
                selectedDriverName={selectedDriverName}
                onDriverChange={setSelectedDriverName}
                onAssign={assignSelectedLoad}
                onComplete={openCompletionForm}
              />
            </>
          ) : (
            <div className="border border-white/[0.08] bg-white/[0.025] p-5 text-sm text-slate-500">Select an accepted load to assign a driver and trailer workflow.</div>
          )}
        </div>
      </div>
      {completionLoad ? (
        <LoadCompletionModal
          load={completionLoad}
          assignment={assignments.find((item) => item.loadId === completionLoad.id)}
          draft={completionDraft}
          error={completionError}
          onDraftChange={setCompletionDraft}
          onClose={() => setCompletionLoad(null)}
          onSave={saveCompletion}
        />
      ) : null}
    </PageFrame>
  );
}

export function AssignmentsPage() {
  const assignments = readStoredJson<LoadAssignment[]>(assignmentsStorageKey, []);
  const drivers = readStoredJson<DriverUnit[]>(driversStorageKey, initialDrivers);
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const loadDecisions = useWorkspaceStore((state) => state.loadDecisions);
  const acceptedLoads = useMemo(
    () => Object.values(loadDecisions).filter((decision) => decision.status === "accepted").map((decision) => decision.load),
    [loadDecisions]
  );
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const effectiveQuery = query || globalSearch;
  const activeAssignments = assignments.filter((assignment) => assignment.status === "assigned");
  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed");
  const visibleAssignments = assignments.filter((assignment) => {
    const load = acceptedLoads.find((item) => item.id === assignment.loadId) ?? mockLoads.find((item) => item.id === assignment.loadId);
    const text = [assignment.loadId, assignment.driverName, assignment.status, load?.pickup, load?.delivery, load?.broker]
      .join(" ")
      .toLowerCase();

    return (filter === "All" || assignment.status === filter.toLowerCase()) && text.includes(effectiveQuery.toLowerCase());
  });

  return (
    <PageFrame
      title="Assignments"
      subtitle="Operational board for driver-load assignments, active work, and completed load records."
      icon={ClipboardCheck}
      stats={[
        { label: "Assigned", value: String(activeAssignments.length), tone: "amber" },
        { label: "Completed", value: String(completedAssignments.length), tone: "green" },
        { label: "Drivers", value: String(drivers.length), tone: "cyan" }
      ]}
    >
      <ToolbarSearch query={query || globalSearch} onQueryChange={setQuery} placeholder="Search load, driver, lane, broker..." />
      <SegmentedControl values={["All", "Assigned", "Completed"]} active={filter} onChange={setFilter} className="mt-3" />
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <AssignmentColumn title="Unassigned" tone="slate" assignments={[]} loads={acceptedLoads.filter((load) => !assignments.some((assignment) => assignment.loadId === load.id)).slice(0, 8)} />
        <AssignmentColumn title="Assigned" tone="amber" assignments={visibleAssignments.filter((assignment) => assignment.status === "assigned")} />
        <AssignmentColumn title="Completed" tone="green" assignments={visibleAssignments.filter((assignment) => assignment.status === "completed")} />
      </div>
    </PageFrame>
  );
}

export function SearchSessionsPage() {
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const setGlobalSearch = useWorkspaceStore((state) => state.setGlobalSearch);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const focusLoad = useWorkspaceStore((state) => state.focusLoad);
  const trucks = readStoredJson<TruckUnit[]>(trucksStorageKey, initialTrucks);
  const drivers = readStoredJson<DriverUnit[]>(driversStorageKey, initialDrivers);
  const assignments = readStoredJson<LoadAssignment[]>(assignmentsStorageKey, []);
  const [sessions, setSessions] = useState<SearchSession[]>(() => readStoredJson<SearchSession[]>(sessionStorageKey, initialSessions));
  const [form, setForm] = useState({ name: "", origin: "", destination: "", equipment: "Dry Van", minRpm: "2.50" });
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? "");
  const [query, setQuery] = useState(globalSearch);
  const [category, setCategory] = useState("All");
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const running = sessions.filter((session) => session.status === "running").length;
  const searchResults = useMemo(
    () => buildSearchCenterResults(query || globalSearch, category, trucks, drivers, assignments),
    [assignments, category, drivers, globalSearch, query, trucks]
  );
  const movingTrucks = trucks.filter((truck) => getTrackerState(truck) === "moving").length;
  const stoppedTrucks = trucks.filter((truck) => getTrackerState(truck) === "stopped").length;
  const matchingLoads = useMemo(() => {
    if (!selectedSession) {
      return [];
    }

    const searchText = `${selectedSession.origin} ${selectedSession.destination}`.toLowerCase();
    return mockLoads
      .filter((load) => load.rpm >= selectedSession.minRpm)
      .filter((load) => selectedSession.equipment === "Van/Reefer" || load.equipment === selectedSession.equipment)
      .filter((load) => searchText.includes("any") || `${load.pickup} ${load.delivery}`.toLowerCase().includes(selectedSession.origin.split(",")[0].toLowerCase()))
      .slice(0, 5);
  }, [selectedSession]);

  useEffect(() => {
    writeStoredJson(sessionStorageKey, sessions);
  }, [sessions]);

  const createSession = () => {
    const session: SearchSession = {
      id: `S-${Date.now().toString().slice(-5)}`,
      name: form.name || "New Live Search",
      origin: form.origin || "Any",
      destination: form.destination || "Any",
      equipment: form.equipment,
      minRpm: Number(form.minRpm) || 2.5,
      status: "queued",
      createdAt: Date.now()
    };
    setSessions((items) => [session, ...items]);
    setSelectedSessionId(session.id);
    setForm({ name: "", origin: "", destination: "", equipment: "Dry Van", minRpm: "2.50" });
  };

  const updateSessionStatus = (id: string, status: SearchSession["status"]) => {
    setSessions((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const openSearchResult = (result: SearchCenterResult) => {
    setGlobalSearch(result.query);
    if (result.loadId) {
      focusLoad(result.loadId);
      return;
    }
    setActivePage(result.page);
  };

  return (
    <PageFrame
      title="Search Center"
      subtitle="Unified command search for loads, drivers, trailers, trackers, brokers, and live sessions."
      icon={Search}
      stats={[
        { label: "Results", value: String(searchResults.length), tone: "cyan" },
        { label: "Moving", value: String(movingTrucks), tone: "green" },
        { label: "Stopped", value: String(stoppedTrucks), tone: stoppedTrucks > 0 ? "red" : "green" }
      ]}
    >
      <section className="border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Unified Search Console</h2>
            <p className="mt-1 text-xs text-slate-500">Search load ID, driver, phone, broker, trailer, city/state, moving, stopped, assigned, or completed.</p>
          </div>
          <Badge tone="violet">Ctrl K also works</Badge>
        </div>
        <ToolbarSearch
          query={query || globalSearch}
          onQueryChange={(value) => {
            setQuery(value);
            setGlobalSearch(value);
          }}
          placeholder="Search everything: LD-912, Carter, Unit 318, TX, stopped, in transit..."
        />
        <SegmentedControl values={["All", "Loads", "Drivers", "Trailers", "Brokers", "Assignments"]} active={category} onChange={setCategory} className="mt-3" />
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {searchResults.length > 0 ? searchResults.map((result) => (
            <button key={result.id} type="button" onClick={() => openSearchResult(result)} className="border border-white/[0.08] bg-white/[0.035] p-3 text-left hover:border-cyan-300/25 hover:bg-cyan-300/10">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-100">{result.title}</span>
                <Badge tone={result.tone}>{result.type}</Badge>
              </div>
              <p className="line-clamp-2 text-xs leading-5 text-slate-500">{result.body}</p>
            </button>
          )) : <div className="col-span-full border border-white/[0.08] bg-white/[0.025] p-5 text-sm text-slate-500">No results yet. Try trailer state, driver name, broker, load ID, or tracker status.</div>}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="border border-white/[0.08] bg-white/[0.025] p-4">
          <h2 className="text-sm font-semibold text-slate-100">New Session</h2>
          <FormInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="Southeast hot lanes" />
          <FormInput label="Origin" value={form.origin} onChange={(value) => setForm({ ...form, origin: value })} placeholder="Atlanta, GA" />
          <FormInput label="Destination" value={form.destination} onChange={(value) => setForm({ ...form, destination: value })} placeholder="Nashville, TN" />
          <FormInput label="Equipment" value={form.equipment} onChange={(value) => setForm({ ...form, equipment: value })} placeholder="Dry Van" />
          <FormInput label="Min RPM" value={form.minRpm} onChange={(value) => setForm({ ...form, minRpm: value })} placeholder="2.50" />
          <button type="button" onClick={createSession} className="mt-4 h-9 w-full border border-violet-300/30 bg-violet-400/15 text-sm text-violet-100">Create Session</button>
        </section>
        <section className="overflow-hidden border border-white/[0.08] bg-white/[0.025]">
          <DataHeader columns="grid-cols-[1fr_1fr_120px_90px_130px]" labels={["Session", "Lane", "Equipment", "RPM", "Controls"]} />
          {sessions.map((session) => (
            <div key={session.id} onClick={() => setSelectedSessionId(session.id)} className={cn("grid w-full cursor-pointer grid-cols-[1fr_1fr_120px_90px_130px] items-center border-b border-white/[0.06] px-3 py-3 text-left text-sm text-slate-300 hover:bg-cyan-300/[0.06]", selectedSession?.id === session.id && "bg-violet-400/[0.09]")}>
              <div>
                <div className="font-semibold text-slate-100">{session.name}</div>
                <Badge tone={session.status === "running" ? "green" : session.status === "paused" ? "amber" : "cyan"} className="mt-2">{session.status}</Badge>
              </div>
              <span className="truncate">
                {session.origin}
                {" -> "}
                {session.destination}
              </span>
              <span>{session.equipment}</span>
              <span className="font-mono">${session.minRpm.toFixed(2)}</span>
              <div className="flex gap-2">
                <IconButton label="Toggle session" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); updateSessionStatus(session.id, session.status === "running" ? "paused" : "running"); }}>
                  {session.status === "running" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </IconButton>
                <IconButton label="Delete session" className="h-8 w-8" onClick={(event) => { event.stopPropagation(); setSessions((items) => items.filter((item) => item.id !== session.id)); }}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </div>
          ))}
        </section>
      </div>
      {selectedSession ? (
        <section className="mt-4 border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">{selectedSession.name} Matches</h2>
              <p className="mt-1 text-xs text-slate-500">Frontend preview of loads this live search would stream from the backend.</p>
            </div>
            <Badge tone={selectedSession.status === "running" ? "green" : selectedSession.status === "paused" ? "amber" : "cyan"}>{selectedSession.status}</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {matchingLoads.map((load) => (
              <button key={load.id} type="button" className="border border-white/[0.08] bg-white/[0.035] p-3 text-left hover:border-cyan-300/25">
                <div className="font-mono text-xs text-cyan-200">{load.id}</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">{load.pickup}</div>
                <div className="text-xs text-slate-500">{load.delivery}</div>
                <div className="mt-2 font-mono text-sm text-emerald-300">${load.rpm.toFixed(2)} RPM</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </PageFrame>
  );
}

export function BrokersPage() {
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const brokers = Object.values(mockBrokerProfiles);
  const [query, setQuery] = useState("");
  const [selectedBroker, setSelectedBroker] = useState(brokers[0]);
  const [note, setNote] = useState("");
  const [workflow, setWorkflow] = useState<BrokerWorkflow>(() => readStoredJson<BrokerWorkflow>(brokerWorkflowStorageKey, brokerWorkflowDefaults));
  const selectedNotes = workflow.notesByBroker[selectedBroker.broker] ?? [];
  const effectiveQuery = query || globalSearch;
  const visibleBrokers = brokers.filter((broker) =>
    [broker.broker, broker.company, broker.phone, broker.email].join(" ").toLowerCase().includes(effectiveQuery.toLowerCase())
  );

  useEffect(() => {
    writeStoredJson(brokerWorkflowStorageKey, workflow);
  }, [workflow]);

  const toggleWatchedBroker = () => {
    setWorkflow((state) => {
      const isWatched = state.watchedBrokerIds.includes(selectedBroker.broker);
      return {
        ...state,
        watchedBrokerIds: isWatched
          ? state.watchedBrokerIds.filter((id) => id !== selectedBroker.broker)
          : [selectedBroker.broker, ...state.watchedBrokerIds]
      };
    });
  };

  const markBrokerCalled = () => {
    setWorkflow((state) => ({
      ...state,
      calledBrokerIds: Array.from(new Set([selectedBroker.broker, ...state.calledBrokerIds]))
    }));
  };

  const saveBrokerNote = () => {
    const cleanNote = note.trim();
    if (!cleanNote) {
      return;
    }

    setWorkflow((state) => ({
      ...state,
      notesByBroker: {
        ...state.notesByBroker,
        [selectedBroker.broker]: [cleanNote, ...(state.notesByBroker[selectedBroker.broker] ?? [])].slice(0, 6)
      }
    }));
    setNote("");
  };

  return (
    <PageFrame
      title="Brokers"
      subtitle="Broker intelligence, calls, notes, payment speed, and score history."
      icon={ShieldCheck}
      stats={[
        { label: "Profiles", value: String(brokers.length), tone: "violet" },
        { label: "Watched", value: String(workflow.watchedBrokerIds.length), tone: "green" },
        { label: "Avg Pay", value: `${Math.round(average(brokers.map((broker) => broker.daysToPay)))}d`, tone: "cyan" }
      ]}
    >
      <ToolbarSearch query={query || globalSearch} onQueryChange={setQuery} placeholder="Search broker, company, phone, or email..." />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden border border-white/[0.08] bg-white/[0.025]">
          <DataHeader columns="grid-cols-[1fr_1fr_100px_100px_120px]" labels={["Broker", "Company", "Score", "Pay", "Action"]} />
          {visibleBrokers.map((broker) => (
            <button key={broker.broker} type="button" onClick={() => setSelectedBroker(broker)} className={cn("grid w-full grid-cols-[1fr_1fr_100px_100px_120px] items-center border-b border-white/[0.06] px-3 py-3 text-left text-sm text-slate-300 hover:bg-cyan-300/[0.06]", selectedBroker.broker === broker.broker && "bg-violet-400/[0.09]")}>
              <span className="font-semibold text-slate-100">{broker.broker}</span>
              <span>{broker.company}</span>
              <span className="font-mono text-emerald-300">{broker.score}</span>
              <span className="font-mono">{broker.daysToPay}d</span>
              <span className="flex gap-1">
                <Badge tone={broker.score >= 84 ? "green" : "amber"}>{broker.score >= 84 ? "preferred" : "review"}</Badge>
                {workflow.watchedBrokerIds.includes(broker.broker) ? <Badge tone="violet">watch</Badge> : null}
              </span>
            </button>
          ))}
        </section>
        <aside className="border border-white/[0.08] bg-white/[0.025] p-4">
          <h2 className="text-sm font-semibold text-slate-100">{selectedBroker.broker}</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <InfoLine label="Phone" value={selectedBroker.phone} />
            <InfoLine label="Email" value={selectedBroker.email} />
            <InfoLine label="Score" value={`${selectedBroker.score}/100`} />
            <InfoLine label="Days to pay" value={String(selectedBroker.daysToPay)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionButton icon={PhoneCall} label={workflow.calledBrokerIds.includes(selectedBroker.broker) ? "Called" : "Call"} onClick={markBrokerCalled} />
            <ActionButton icon={Save} label={workflow.watchedBrokerIds.includes(selectedBroker.broker) ? "Unwatch" : "Watch"} onClick={toggleWatchedBroker} />
          </div>
          <label className="mt-4 block text-xs text-slate-500">
            New note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-20 w-full border border-white/[0.08] bg-white/[0.035] p-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35" />
          </label>
          <button type="button" onClick={saveBrokerNote} className="mt-2 h-9 w-full border border-cyan-300/25 bg-cyan-300/10 text-sm text-cyan-100">Save Note</button>
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Saved notes</h3>
            {selectedNotes.length > 0 ? selectedNotes.map((item) => (
              <div key={item} className="border border-white/[0.08] bg-white/[0.035] p-2 text-xs text-slate-300">{item}</div>
            )) : <p className="text-xs text-slate-500">No broker notes saved yet.</p>}
          </div>
        </aside>
      </div>
    </PageFrame>
  );
}

export function CompaniesPage() {
  const [records, setRecords] = useState(() => readStoredJson(companiesStorageKey, companies));
  const [query, setQuery] = useState("");
  const visibleCompanies = records.filter((company) => company.name.toLowerCase().includes(query.toLowerCase()) || company.type.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    writeStoredJson(companiesStorageKey, records);
  }, [records]);

  return (
    <PageFrame
      title="Companies"
      subtitle="Company records, verification, contact counts, and risk review."
      icon={Building2}
      stats={[
        { label: "Companies", value: String(records.length), tone: "cyan" },
        { label: "Verified", value: String(records.filter((company) => company.verified).length), tone: "green" },
        { label: "Review", value: String(records.filter((company) => company.risk !== "low").length), tone: "amber" }
      ]}
    >
      <ToolbarSearch query={query} onQueryChange={setQuery} placeholder="Search company or type..." />
      <section className="mt-4 overflow-hidden border border-white/[0.08] bg-white/[0.025]">
        <DataHeader columns="grid-cols-[1.4fr_120px_110px_120px_140px]" labels={["Company", "Type", "Contacts", "Risk", "Verify"]} />
        {visibleCompanies.map((company) => (
          <div key={company.name} className="grid grid-cols-[1.4fr_120px_110px_120px_140px] items-center border-b border-white/[0.06] px-3 py-3 text-sm text-slate-300">
            <span className="font-semibold text-slate-100">{company.name}</span>
            <Badge tone="cyan">{company.type}</Badge>
            <span className="font-mono">{company.contacts}</span>
            <Badge tone={company.risk === "low" ? "green" : "amber"}>{company.risk}</Badge>
            <button type="button" onClick={() => setRecords((items) => items.map((item) => item.name === company.name ? { ...item, verified: !item.verified } : item))} className="text-xs text-cyan-200 hover:text-cyan-100">
              {company.verified ? "Verified" : "Mark verified"}
            </button>
          </div>
        ))}
      </section>
    </PageFrame>
  );
}

export function TrucksPage() {
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const [trucks, setTrucks] = useState(() => readStoredJson<TruckUnit[]>(trucksStorageKey, initialTrucks));
  const [drivers, setDrivers] = useState(() => readStoredJson<DriverUnit[]>(driversStorageKey, initialDrivers));
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<TruckDraft>(emptyTruckDraft);
  const [trackerDrafts, setTrackerDrafts] = useState<Record<string, TrackerDraft>>({});
  const available = trucks.filter((truck) => truck.status === "available").length;
  const moving = trucks.filter((truck) => getTrackerState(truck) === "moving").length;
  const stopped = trucks.filter((truck) => getTrackerState(truck) === "stopped").length;
  const visibleTrucks = useMemo(() => {
    const normalized = globalSearch.trim().toLowerCase();
    if (!normalized) {
      return trucks;
    }

    return trucks.filter((truck) => {
      const trackerState = getTrackerState(truck);
      return [
        truck.id,
        truck.equipment,
        truck.location,
        truck.status,
        truck.driver,
        truck.trackerCity,
        truck.trackerStateCode,
        truck.trackerNote,
        trackerState,
        trackerState === "moving" ? "in transit loaded moving" : "stopped service parked"
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [globalSearch, trucks]);

  useEffect(() => {
    writeStoredJson(trucksStorageKey, trucks);
  }, [trucks]);

  useEffect(() => {
    writeStoredJson(driversStorageKey, drivers);
  }, [drivers]);

  const createTruck = () => {
    const id = draft.id.trim();
    if (!id || trucks.some((truck) => truck.id.toLowerCase() === id.toLowerCase())) {
      return;
    }

    setTrucks((items) => [
      {
        id,
        equipment: draft.equipment || "Dry Van",
        location: draft.location || "Unknown",
        status: "available",
        driver: "Unassigned",
        trackerState: "stopped",
        trackerCity: draft.location.split(",")[0]?.trim() || "Unknown",
        trackerStateCode: draft.location.split(",")[1]?.trim() || "",
        trackerNote: "Created manually",
        trackerUpdatedAt: Date.now()
      },
      ...items
    ]);
    setDraft(emptyTruckDraft);
    setAddOpen(false);
  };

  const assignDriverToTruck = (truckId: string, driverName: string) => {
    if (!driverName) {
      return;
    }

    const previousDriverName = trucks.find((truck) => truck.id === truckId)?.driver;
    setTrucks((items) =>
      items.map((truck) => {
        if (truck.id === truckId) {
          return { ...truck, driver: driverName };
        }
        if (truck.driver === driverName) {
          return { ...truck, driver: "Unassigned" };
        }
        return truck;
      })
    );
    setDrivers((items) =>
      items.map((driver) => {
        if (driver.name === driverName) {
          return { ...driver, truck: truckId };
        }
        if (driver.name === previousDriverName) {
          return { ...driver, truck: "Unassigned" };
        }
        return driver;
      })
    );
  };

  const unassignTruckDriver = (truckId: string) => {
    const truck = trucks.find((item) => item.id === truckId);
    if (!truck || truck.driver === "Unassigned") {
      return;
    }

    setTrucks((items) => items.map((item) => (item.id === truckId ? { ...item, driver: "Unassigned" } : item)));
    setDrivers((items) => items.map((driver) => (driver.name === truck.driver ? { ...driver, truck: "Unassigned" } : driver)));
  };

  const deleteTruck = (truckId: string) => {
    const truck = trucks.find((item) => item.id === truckId);
    setTrucks((items) => items.filter((item) => item.id !== truckId));
    if (truck?.driver && truck.driver !== "Unassigned") {
      setDrivers((items) => items.map((driver) => (driver.name === truck.driver ? { ...driver, truck: "Unassigned" } : driver)));
    }
  };

  const updateTracker = (truckId: string) => {
    const truck = trucks.find((item) => item.id === truckId);
    const draftValue = trackerDrafts[truckId] ?? trackerDraftFromTruck(truck);

    setTrucks((items) =>
      items.map((item) =>
        item.id === truckId
          ? {
              ...item,
              location: [draftValue.trackerCity, draftValue.trackerStateCode].filter(Boolean).join(", ") || item.location,
              status: draftValue.trackerState === "moving" ? "loaded" : item.status === "loaded" ? "available" : item.status,
              trackerState: draftValue.trackerState,
              trackerCity: draftValue.trackerCity || item.trackerCity || item.location.split(",")[0]?.trim() || "Unknown",
              trackerStateCode: draftValue.trackerStateCode || item.trackerStateCode || item.location.split(",")[1]?.trim() || "",
              trackerNote: draftValue.trackerNote,
              trackerUpdatedAt: Date.now()
            }
          : item
      )
    );
  };

  return (
    <PageFrame
      title="Trucks / Trailers"
      subtitle="Trailer creation, driver linking, availability, equipment, and current location."
      icon={Truck}
      stats={[
        { label: "Available", value: String(available), tone: "green" },
        { label: "Moving", value: String(moving), tone: "cyan" },
        { label: "Stopped", value: String(stopped), tone: stopped > 0 ? "red" : "green" }
      ]}
      actions={<IconButton label="Add trailer" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /></IconButton>}
    >
      <FleetGrid
        items={visibleTrucks}
        drivers={drivers}
        onStatus={(id, status) => {
          setTrucks((items) => items.map((truck) => truck.id === id ? { ...truck, status } : truck));
        }}
        onDriverAssign={assignDriverToTruck}
        onDriverUnassign={unassignTruckDriver}
        onDelete={deleteTruck}
        trackerDrafts={trackerDrafts}
        onTrackerDraftChange={(truckId, value) => setTrackerDrafts((items) => ({ ...items, [truckId]: value }))}
        onTrackerUpdate={updateTracker}
      />
      {addOpen ? (
        <AddTruckModal
          draft={draft}
          onDraftChange={setDraft}
          onClose={() => setAddOpen(false)}
          onSave={createTruck}
        />
      ) : null}
    </PageFrame>
  );
}

export function DriversPage() {
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const [drivers, setDrivers] = useState(() => readStoredJson<DriverUnit[]>(driversStorageKey, initialDrivers));
  const [trucks, setTrucks] = useState(() => readStoredJson<TruckUnit[]>(trucksStorageKey, initialTrucks));
  const [assignments] = useState(() => readStoredJson<LoadAssignment[]>(assignmentsStorageKey, []));
  const [query, setQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverUnit>(initialDrivers[0]);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<DriverDraft>(emptyDriverDraft);
  const activeAssignments = assignments.filter((assignment) => assignment.status === "assigned");
  const completedAssignments = assignments.filter((assignment) => assignment.status === "completed");
  const visibleDrivers = useMemo(() => {
    const normalized = (query || globalSearch).trim().toLowerCase();

    if (!normalized) {
      return drivers;
    }

    return drivers.filter((driver) => {
      const activeAssignment = activeAssignments.find((assignment) => assignment.driverName === driver.name);

      return [
        driver.name,
        driver.phone,
        driver.email,
        driver.license,
        driver.location,
        driver.homeTerminal,
        driver.status,
        driver.truck,
        activeAssignment?.loadId ?? "",
        activeAssignment ? "assigned active load driving" : ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [activeAssignments, drivers, globalSearch, query]);

  useEffect(() => {
    writeStoredJson(driversStorageKey, drivers);
  }, [drivers]);

  useEffect(() => {
    writeStoredJson(trucksStorageKey, trucks);
  }, [trucks]);

  const createDriver = () => {
    const name = draft.name.trim();
    if (!name || drivers.some((driver) => driver.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    setDrivers((items) => [
      {
        name,
        phone: draft.phone || "Not provided",
        email: draft.email || "not-provided@fleet.local",
        license: draft.license || "CDL-PENDING",
        location: draft.location || "Unknown",
        homeTerminal: draft.homeTerminal || "Unassigned",
        status: "available",
        truck: "Unassigned",
        loadsToday: 0,
        completedToday: 0,
        weeklyLoads: 0,
        onTimeRate: 100,
        avgRpm: 0
      },
      ...items
    ]);
    setDraft(emptyDriverDraft);
    setAddOpen(false);
  };

  const deleteDriver = (driverName: string) => {
    if (activeAssignments.some((assignment) => assignment.driverName === driverName)) {
      return;
    }

    setDrivers((items) => items.filter((driver) => driver.name !== driverName));
    setTrucks((items) => items.map((truck) => (truck.driver === driverName ? { ...truck, driver: "Unassigned" } : truck)));
  };

  return (
    <PageFrame
      title="Drivers"
      subtitle="Driver availability, contact status, location, and truck assignment."
      icon={UserRoundCheck}
      stats={[
        { label: "Found", value: String(visibleDrivers.length), tone: "violet" },
        { label: "Assigned", value: String(activeAssignments.length), tone: "amber" },
        { label: "Completed", value: String(completedAssignments.length), tone: "cyan" }
      ]}
      actions={<IconButton label="Add driver" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /></IconButton>}
    >
      <div className="border border-white/[0.08] bg-white/[0.025] p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <Search className="h-4 w-4 text-cyan-200" />
          Driver Search
        </div>
        <ToolbarSearch
          query={query || globalSearch}
          onQueryChange={setQuery}
          placeholder="Search by name, phone, email, CDL/license, city, terminal, truck, status..."
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {visibleDrivers.map((driver) => (
          <section key={driver.name} className={cn("border border-white/[0.08] bg-white/[0.025] p-4", analyticsOpen && selectedDriver.name === driver.name && "border-violet-300/35 bg-violet-400/[0.08]")}>
            {(() => {
              const activeAssignment = activeAssignments.find((assignment) => assignment.driverName === driver.name);
              const activeLoad = activeAssignment ? mockLoads.find((load) => load.id === activeAssignment.loadId) : undefined;
              const driverRecords = completedAssignments.filter((assignment) => assignment.driverName === driver.name);
              const linkedTruck = trucks.find((truck) => truck.driver === driver.name);
              const effectiveStatus = activeAssignment ? "assigned" : driver.status;
              return (
                <>
            <div className="mb-3 flex items-center justify-between">
              <Badge tone={effectiveStatus === "available" ? "green" : effectiveStatus === "assigned" || effectiveStatus === "driving" ? "cyan" : effectiveStatus === "calling" ? "amber" : "slate"}>{effectiveStatus}</Badge>
              <MapPin className="h-4 w-4 text-slate-500" />
            </div>
            <h2 className="whitespace-normal break-words text-base font-semibold leading-6 text-slate-100">{driver.name}</h2>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <div className="font-mono text-cyan-200">{driver.phone}</div>
              <div>{driver.email}</div>
              <div>{driver.license}</div>
              <div>{driver.location} / {driver.homeTerminal}</div>
              <div className="text-cyan-200">Trailer: {linkedTruck?.id ?? driver.truck}</div>
              {activeAssignment ? (
                <div className="mt-2 border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
                  Active load: <span className="font-mono">{activeAssignment.loadId}</span>
                  {activeLoad ? <span className="block text-slate-400">{activeLoad.pickup} {"->"} {activeLoad.delivery}</span> : null}
                </div>
              ) : null}
              <div className="pt-1 text-emerald-300">Completed loads: {driverRecords.length}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["available", "driving", "calling", "off"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={Boolean(activeAssignment)}
                  onClick={() => setDrivers((items) => items.map((item) => item.name === driver.name ? { ...item, status } : item))}
                  className="border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-300 hover:border-cyan-300/25 disabled:cursor-not-allowed disabled:text-slate-600"
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const isSameDriverOpen = analyticsOpen && selectedDriver.name === driver.name;
                setSelectedDriver(driver);
                setAnalyticsOpen(!isSameDriverOpen);
              }}
              className="mt-3 h-9 w-full border border-cyan-300/25 bg-cyan-300/10 text-sm text-cyan-100"
            >
              {analyticsOpen && selectedDriver.name === driver.name ? "Hide Analytics" : "Show Analytics"}
            </button>
            <button
              type="button"
              disabled={Boolean(activeAssignment)}
              onClick={() => deleteDriver(driver.name)}
              className="mt-2 h-8 w-full border border-red-400/20 bg-red-400/10 text-xs text-red-200 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-slate-600"
            >
              Delete Driver
            </button>
                </>
              );
            })()}
          </section>
        ))}
      </div>
      {analyticsOpen ? (
        <DriverAnalyticsModal
          driver={selectedDriver}
          records={completedAssignments.filter((assignment) => assignment.driverName === selectedDriver.name)}
          onClose={() => setAnalyticsOpen(false)}
        />
      ) : null}
      {addOpen ? (
        <AddDriverModal
          draft={draft}
          onDraftChange={setDraft}
          onClose={() => setAddOpen(false)}
          onSave={createDriver}
        />
      ) : null}
    </PageFrame>
  );
}

export function AnalyticsPage() {
  const assignments = readStoredJson<LoadAssignment[]>(assignmentsStorageKey, []);
  const drivers = readStoredJson<DriverUnit[]>(driversStorageKey, initialDrivers);
  const [range, setRange] = useState("All");
  const [selectedMetric, setSelectedMetric] = useState("Completed Loads");
  const now = Date.now();
  const rangeStart = range === "Today" ? now - 24 * 60 * 60 * 1000 : range === "7D" ? now - 7 * 24 * 60 * 60 * 1000 : range === "30D" ? now - 30 * 24 * 60 * 60 * 1000 : 0;
  const rangeAssignments = assignments.filter((assignment) => {
    const eventTime = assignment.completedAt ?? assignment.assignedAt;
    return rangeStart === 0 || eventTime >= rangeStart;
  });
  const activeAssignments = rangeAssignments.filter((assignment) => assignment.status === "assigned");
  const completedAssignments = rangeAssignments.filter((assignment) => assignment.status === "completed");
  const scoredAssignments = completedAssignments.filter((assignment) => typeof assignment.score === "number");
  const completionRate = rangeAssignments.length > 0 ? Math.round((completedAssignments.length / rangeAssignments.length) * 100) : 0;
  const avgScore = average(scoredAssignments.map((assignment) => assignment.score ?? 0));
  const totalDetention = completedAssignments.reduce((sum, assignment) => sum + (assignment.detentionMinutes ?? 0), 0);
  const issueCounts = {
    none: completedAssignments.filter((assignment) => assignment.issueLevel === "none" || !assignment.issueLevel).length,
    minor: completedAssignments.filter((assignment) => assignment.issueLevel === "minor").length,
    major: completedAssignments.filter((assignment) => assignment.issueLevel === "major").length
  };
  const driverLeaderboard = drivers
    .map((driver) => {
      const records = completedAssignments.filter((assignment) => assignment.driverName === driver.name);
      return {
        driver,
        completed: records.length,
        avgScore: average(records.map((record) => record.score ?? 0).filter(Boolean)),
        detention: records.reduce((sum, record) => sum + (record.detentionMinutes ?? 0), 0)
      };
    })
    .sort((a, b) => b.completed - a.completed || b.avgScore - a.avgScore);
  const brokerRows = Object.values(
    completedAssignments.reduce<Record<string, { broker: string; completed: number; avgRpm: number; rate: number }>>((rows, assignment) => {
      const load = mockLoads.find((item) => item.id === assignment.loadId);
      if (!load) {
        return rows;
      }
      const existing = rows[load.broker] ?? { broker: load.broker, completed: 0, avgRpm: 0, rate: 0 };
      const completed = existing.completed + 1;
      rows[load.broker] = {
        broker: load.broker,
        completed,
        avgRpm: (existing.avgRpm * existing.completed + load.rpm) / completed,
        rate: existing.rate + load.rate
      };
      return rows;
    }, {})
  ).sort((a, b) => b.completed - a.completed);
  const kpis = [
    { label: "Assigned Loads", value: String(activeAssignments.length), tone: "amber" as Tone },
    { label: "Completed Loads", value: String(completedAssignments.length), tone: "green" as Tone },
    { label: "Completion Rate", value: `${completionRate}%`, tone: "cyan" as Tone },
    { label: "Avg Driver Score", value: scoredAssignments.length > 0 ? avgScore.toFixed(1) : "n/a", tone: "violet" as Tone },
    { label: "Major Issues", value: String(issueCounts.major), tone: issueCounts.major > 0 ? "red" as Tone : "slate" as Tone },
    { label: "Detention Minutes", value: String(totalDetention), tone: totalDetention > 0 ? "amber" as Tone : "slate" as Tone }
  ];
  const detailRows = analyticsDetailRows(selectedMetric, {
    range,
    activeAssignments,
    completedAssignments,
    completionRate,
    avgScore,
    issueCounts,
    totalDetention,
    topDriver: driverLeaderboard[0]?.driver.name ?? "n/a",
    topBroker: brokerRows[0]?.broker ?? "n/a"
  });

  return (
    <PageFrame
      title="Analytics"
      subtitle="Dispatcher performance, driver outcomes, load lifecycle, broker trends, and issue tracking."
      icon={ChartNoAxesCombined}
      stats={[
        { label: "Range", value: range, tone: "violet" },
        { label: "Assignments", value: String(rangeAssignments.length), tone: "cyan" },
        { label: "Completed", value: String(completedAssignments.length), tone: "green" }
      ]}
    >
      <SegmentedControl values={["Today", "7D", "30D", "All"]} active={range} onChange={setRange} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <button key={kpi.label} type="button" onClick={() => setSelectedMetric(kpi.label)} className={cn("border text-left transition", selectedMetric === kpi.label ? "border-violet-300/35 bg-violet-400/10" : "border-white/[0.08] bg-white/[0.025] hover:border-cyan-300/25")}>
            <MetricCard {...kpi} />
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsTable
              title="Driver Leaderboard"
              columns={["Driver", "Loads", "Score", "Detention"]}
              rows={driverLeaderboard.map((row) => [row.driver.name, String(row.completed), row.completed > 0 ? row.avgScore.toFixed(1) : "n/a", `${row.detention}m`])}
            />
            <AnalyticsTable
              title="Broker Performance"
              columns={["Broker", "Loads", "Avg RPM", "Revenue"]}
              rows={brokerRows.map((row) => [row.broker, String(row.completed), `$${row.avgRpm.toFixed(2)}`, formatCurrency(row.rate)])}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <AnalyticsBreakdown
              title="Load Lifecycle"
              items={[
                ["Assigned", activeAssignments.length, "amber"],
                ["Completed", completedAssignments.length, "green"],
                ["Unassigned", Math.max(0, mockLoads.length - assignments.length), "slate"]
              ]}
            />
            <AnalyticsBreakdown
              title="Issues"
              items={[
                ["None", issueCounts.none, "green"],
                ["Minor", issueCounts.minor, "amber"],
                ["Major", issueCounts.major, "red"]
              ]}
            />
          </div>
        </section>
        <DetailPanel title={selectedMetric} rows={detailRows} actions={["Export report", "Compare lanes", "Open driver history", "Refresh KPIs"]} />
      </div>
    </PageFrame>
  );
}

export function NotificationsPage() {
  const notifications = useWorkspaceStore((state) => state.notifications);
  const openNotificationDetail = useWorkspaceStore((state) => state.openNotificationDetail);
  const markAllNotificationsRead = useWorkspaceStore((state) => state.markAllNotificationsRead);
  const clearReadNotifications = useWorkspaceStore((state) => state.clearReadNotifications);
  const [filter, setFilter] = useState("All");
  const visibleAlerts = notifications.filter((alert) => filter === "All" || (filter === "Unread" ? !alert.read : true));

  return (
    <PageFrame
      title="Notifications"
      subtitle="New load notification inbox, read state, and load-only rules."
      icon={Bell}
      stats={[
        { label: "Unread", value: String(notifications.filter((alert) => !alert.read).length), tone: "red" },
        { label: "New Loads", value: String(notifications.length), tone: "green" },
        { label: "Source", value: "Live Loads", tone: "cyan" }
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl values={["All", "Unread"]} active={filter} onChange={setFilter} />
        <div className="flex gap-2">
          <button type="button" onClick={markAllNotificationsRead} className="h-9 border border-white/[0.08] bg-white/[0.035] px-3 text-xs text-slate-300 hover:border-cyan-300/25">Mark all read</button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border border-white/[0.08] bg-white/[0.025]">
          {visibleAlerts.length > 0 ? visibleAlerts.map((alert) => (
            <button key={alert.id} type="button" onClick={() => openNotificationDetail(alert.id)} className="block w-full border-b border-white/[0.06] p-4 text-left hover:bg-cyan-300/[0.06]">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="green">new load</Badge>
                {!alert.read ? <Badge tone="violet">unread</Badge> : null}
              </div>
              <div className="text-sm font-semibold text-slate-100">{alert.title}</div>
              <p className="mt-1 text-sm text-slate-500">{alert.body}</p>
            </button>
          )) : (
            <div className="p-6 text-sm text-slate-500">No new load notifications yet. They will appear here when the live load stream posts a new load.</div>
          )}
        </section>
        <DetailPanel
          title="Load Notification Rules"
          rows={[["Allowed type", "New load posted"], ["Source", "Live Loads"], ["Other alerts", "Hidden"], ["Sound", "Disabled"]]}
          actions={["Clear read alerts"]}
          onAction={(action) => {
            if (action === "Clear read alerts") {
              clearReadNotifications();
            }
          }}
        />
      </div>
    </PageFrame>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState(settingDefaults);
  const [layoutName, setLayoutName] = useState("Default dispatch layout");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("freight-command-settings");
    if (saved) {
      setSettings(JSON.parse(saved) as typeof settingDefaults);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem("freight-command-settings", JSON.stringify(settings));
    localStorage.setItem("freight-command-layout-name", layoutName);
    setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <PageFrame
      title="Settings"
      subtitle="Workspace preferences, saved layouts, notifications, and frontend persistence."
      icon={Settings}
      stats={[
        { label: "Layouts", value: "4", tone: "violet" },
        { label: "Load Rules", value: "1", tone: "cyan" },
        { label: "Persisted", value: settings.persistLayout ? "On" : "Off", tone: settings.persistLayout ? "green" : "amber" }
      ]}
      actions={<IconButton label="Save settings" onClick={saveSettings}><Save className="h-4 w-4" /></IconButton>}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid gap-3 md:grid-cols-2">
          {Object.entries(settings).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-slate-300">
              <span>
                <span className="block font-semibold text-slate-100">{humanizeSetting(key)}</span>
                <span className="mt-1 block text-xs text-slate-500">Frontend preference for this workspace.</span>
              </span>
              <input type="checkbox" checked={value} onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })} className="h-4 w-4 accent-cyan-300" />
            </label>
          ))}
        </section>
        <aside className="border border-white/[0.08] bg-white/[0.025] p-4">
          <h2 className="text-sm font-semibold text-slate-100">Saved Layout</h2>
          <FormInput label="Layout name" value={layoutName} onChange={setLayoutName} placeholder="Default dispatch layout" />
          <button type="button" onClick={saveSettings} className="mt-4 h-9 w-full border border-violet-300/30 bg-violet-400/15 text-sm text-violet-100">Save Workspace</button>
          {savedAt ? <p className="mt-3 text-xs text-emerald-300">Saved at {savedAt}</p> : null}
        </aside>
      </div>
    </PageFrame>
  );
}

function FleetGrid({
  items,
  drivers,
  onStatus,
  onDriverAssign,
  onDriverUnassign,
  onDelete,
  trackerDrafts,
  onTrackerDraftChange,
  onTrackerUpdate
}: {
  items: TruckUnit[];
  drivers: DriverUnit[];
  onStatus: (id: string, status: TruckUnit["status"]) => void;
  onDriverAssign: (truckId: string, driverName: string) => void;
  onDriverUnassign: (truckId: string) => void;
  onDelete: (truckId: string) => void;
  trackerDrafts: Record<string, TrackerDraft>;
  onTrackerDraftChange: (truckId: string, value: TrackerDraft) => void;
  onTrackerUpdate: (truckId: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((truck) => {
        const trackerState = getTrackerState(truck);
        const draft = trackerDrafts[truck.id] ?? trackerDraftFromTruck(truck);

        return (
          <section key={truck.id} className="border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex gap-1">
                <Badge tone={truck.status === "available" ? "green" : truck.status === "loaded" ? "cyan" : "red"}>{truck.status}</Badge>
                <Badge tone={trackerState === "moving" ? "cyan" : "amber"}>{trackerState}</Badge>
              </div>
              <Truck className="h-4 w-4 text-slate-500" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">{truck.id}</h2>
            <p className="mt-2 text-xs text-slate-500">{truck.equipment} / {truck.location}</p>
            <div className="mt-3 border border-cyan-300/15 bg-cyan-300/[0.06] p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-cyan-100">Tracker location</span>
                <span className="font-mono text-slate-400">{formatTrackerTime(truck.trackerUpdatedAt)}</span>
              </div>
              <div className="mt-2 text-slate-300">
                {truck.trackerCity || truck.location}
                {truck.trackerStateCode ? `, ${truck.trackerStateCode}` : ""}
              </div>
              <div className="mt-1 text-slate-500">{truck.trackerNote || (trackerState === "moving" ? "Moving" : "Stopped")}</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Linked driver: {truck.driver}</p>
            <label className="mt-3 block text-xs text-slate-500">
              Assign driver
              <select
                value={truck.driver === "Unassigned" ? "" : truck.driver}
                onChange={(event) => onDriverAssign(truck.id, event.target.value)}
                className="mt-1 h-9 w-full border border-white/[0.08] bg-[#050b1a] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35"
              >
                <option value="">Unassigned</option>
                {drivers.map((driver) => (
                  <option key={driver.name} value={driver.name}>
                    {driver.name} / {driver.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(["available", "loaded", "service"] as const).map((status) => (
                <button key={status} type="button" onClick={() => onStatus(truck.id, status)} className="border border-white/[0.08] bg-white/[0.035] px-2 py-1.5 text-xs text-slate-300 hover:border-cyan-300/25">
                  {status}
                </button>
              ))}
            </div>
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Update tracker</div>
              <select
                value={draft.trackerState}
                onChange={(event) => onTrackerDraftChange(truck.id, { ...draft, trackerState: event.target.value as TrackerDraft["trackerState"] })}
                className="h-8 w-full border border-white/[0.08] bg-[#050b1a] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35"
              >
                <option value="moving">Moving</option>
                <option value="stopped">Stopped</option>
              </select>
              <div className="mt-2 grid grid-cols-[1fr_70px] gap-2">
                <input value={draft.trackerCity} onChange={(event) => onTrackerDraftChange(truck.id, { ...draft, trackerCity: event.target.value })} className="h-8 border border-white/[0.08] bg-white/[0.035] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35" placeholder="City / area" />
                <input value={draft.trackerStateCode} onChange={(event) => onTrackerDraftChange(truck.id, { ...draft, trackerStateCode: event.target.value.toUpperCase().slice(0, 2) })} className="h-8 border border-white/[0.08] bg-white/[0.035] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35" placeholder="ST" />
              </div>
              <input value={draft.trackerNote} onChange={(event) => onTrackerDraftChange(truck.id, { ...draft, trackerNote: event.target.value })} className="mt-2 h-8 w-full border border-white/[0.08] bg-white/[0.035] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35" placeholder="I-40 eastbound, yard, service stop..." />
              <button type="button" onClick={() => onTrackerUpdate(truck.id)} className="mt-2 h-8 w-full border border-cyan-300/20 bg-cyan-300/10 text-xs text-cyan-100">
                Save Tracker Update
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onDriverUnassign(truck.id)} className="border border-cyan-300/20 bg-cyan-300/10 px-2 py-1.5 text-xs text-cyan-100">
                Unassign
              </button>
              <button type="button" onClick={() => onDelete(truck.id)} className="border border-red-400/20 bg-red-400/10 px-2 py-1.5 text-xs text-red-200">
                Delete
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AddDriverModal({
  draft,
  onDraftChange,
  onClose,
  onSave
}: {
  draft: DriverDraft;
  onDraftChange: (value: DriverDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 px-4">
      <section className="w-full max-w-[680px] border border-white/[0.12] bg-terminal-950 p-4 shadow-2xl shadow-black/70">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Add Driver</h2>
            <p className="mt-1 text-sm text-slate-500">Create a frontend driver profile that can be linked to trailers and loads.</p>
          </div>
          <IconButton label="Close add driver" className="h-9 w-9" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <FormInput label="Full name" value={draft.name} onChange={(name) => onDraftChange({ ...draft, name })} placeholder="G. Beridze" />
          <FormInput label="Phone" value={draft.phone} onChange={(phone) => onDraftChange({ ...draft, phone })} placeholder="(404) 555-0100" />
          <FormInput label="Email" value={draft.email} onChange={(email) => onDraftChange({ ...draft, email })} placeholder="driver@fleet.local" />
          <FormInput label="CDL / License" value={draft.license} onChange={(license) => onDraftChange({ ...draft, license })} placeholder="GA-CDL-0000" />
          <FormInput label="Location" value={draft.location} onChange={(location) => onDraftChange({ ...draft, location })} placeholder="Atlanta, GA" />
          <FormInput label="Home terminal" value={draft.homeTerminal} onChange={(homeTerminal) => onDraftChange({ ...draft, homeTerminal })} placeholder="Atlanta Yard" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-slate-300">Cancel</button>
          <button type="button" onClick={onSave} className="h-9 border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm text-cyan-100">Create Driver</button>
        </div>
      </section>
    </div>
  );
}

function AddTruckModal({
  draft,
  onDraftChange,
  onClose,
  onSave
}: {
  draft: TruckDraft;
  onDraftChange: (value: TruckDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 px-4">
      <section className="w-full max-w-[560px] border border-white/[0.12] bg-terminal-950 p-4 shadow-2xl shadow-black/70">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Add Trailer</h2>
            <p className="mt-1 text-sm text-slate-500">Create a trailer/truck unit and link a driver afterwards.</p>
          </div>
          <IconButton label="Close add trailer" className="h-9 w-9" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <FormInput label="Trailer / Unit ID" value={draft.id} onChange={(id) => onDraftChange({ ...draft, id })} placeholder="Unit 552" />
        <FormInput label="Equipment" value={draft.equipment} onChange={(equipment) => onDraftChange({ ...draft, equipment })} placeholder="Dry Van" />
        <FormInput label="Location" value={draft.location} onChange={(location) => onDraftChange({ ...draft, location })} placeholder="Atlanta, GA" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-slate-300">Cancel</button>
          <button type="button" onClick={onSave} className="h-9 border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm text-cyan-100">Create Trailer</button>
        </div>
      </section>
    </div>
  );
}

function AssignmentColumn({
  title,
  tone,
  assignments,
  loads = []
}: {
  title: string;
  tone: Tone;
  assignments: LoadAssignment[];
  loads?: FreightLoad[];
}) {
  const loadDecisions = useWorkspaceStore((state) => state.loadDecisions);
  const acceptedLoads = useMemo(
    () => Object.values(loadDecisions).filter((decision) => decision.status === "accepted").map((decision) => decision.load),
    [loadDecisions]
  );
  const allLoads = acceptedLoads.length > 0 ? acceptedLoads : mockLoads;

  return (
    <section className="min-h-[420px] border border-white/[0.08] bg-white/[0.025] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <Badge tone={tone}>{assignments.length || loads.length}</Badge>
      </div>
      <div className="space-y-2">
        {loads.map((load) => (
          <div key={load.id} className="border border-white/[0.08] bg-white/[0.035] p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-cyan-200">{load.id}</span>
              <Badge tone={load.hot ? "red" : "slate"}>{load.hot ? "hot" : "open"}</Badge>
            </div>
            <div className="mt-2 text-slate-100">{load.pickup}</div>
            <div className="text-xs text-slate-500">{load.delivery}</div>
            <div className="mt-2 font-mono text-xs text-emerald-300">${load.rpm.toFixed(2)} RPM</div>
          </div>
        ))}
        {assignments.map((assignment) => {
          const load = allLoads.find((item) => item.id === assignment.loadId);

          return (
            <div key={assignment.id} className="border border-white/[0.08] bg-white/[0.035] p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-cyan-200">{assignment.loadId}</span>
                <Badge tone={assignment.status === "completed" ? "green" : "amber"}>{assignment.status}</Badge>
              </div>
              <div className="mt-2 font-semibold text-slate-100">{assignment.driverName}</div>
              <div className="text-xs text-slate-500">{load ? `${load.pickup} -> ${load.delivery}` : "Load details unavailable"}</div>
              {assignment.status === "completed" ? (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <InfoLine label="Score" value={assignment.score ? `${assignment.score}/5` : "n/a"} />
                  <InfoLine label="POD" value={assignment.proofNumber || "n/a"} />
                </div>
              ) : null}
            </div>
          );
        })}
        {assignments.length === 0 && loads.length === 0 ? <div className="p-4 text-sm text-slate-500">No loads in this column.</div> : null}
      </div>
    </section>
  );
}

function LoadAssignmentPanel({
  assignment,
  drivers,
  selectedDriverName,
  onDriverChange,
  onAssign,
  onComplete
}: {
  assignment?: LoadAssignment;
  drivers: DriverUnit[];
  selectedDriverName: string;
  onDriverChange: (value: string) => void;
  onAssign: () => void;
  onComplete: () => void;
}) {
  return (
    <aside className="border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Driver Assignment</h2>
          <p className="mt-1 text-xs text-slate-500">Connect this load to a driver and finish it later with performance notes.</p>
        </div>
        <ClipboardCheck className="h-4 w-4 text-cyan-200" />
      </div>
      <label className="block text-xs text-slate-500">
        Driver
        <select
          value={selectedDriverName}
          onChange={(event) => onDriverChange(event.target.value)}
          className="mt-1 h-9 w-full border border-white/[0.08] bg-[#050b1a] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35"
        >
          {drivers.map((driver) => (
            <option key={driver.name} value={driver.name}>
              {driver.name} / {driver.truck} / {driver.status}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 space-y-3 text-sm text-slate-300">
        <InfoLine label="Assigned driver" value={assignment?.driverName ?? "Not assigned"} />
        <InfoLine label="Assignment state" value={assignment?.status ?? "open"} />
        <InfoLine label="Driver score" value={assignment?.score ? `${assignment.score}/5` : "Not scored"} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onAssign} className="h-9 border border-violet-300/30 bg-violet-400/15 text-sm text-violet-100">
          {assignment ? "Reassign" : "Assign"}
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!assignment}
          className="h-9 border border-cyan-300/25 bg-cyan-300/10 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-slate-600"
        >
          Complete
        </button>
      </div>
    </aside>
  );
}

function LoadCompletionModal({
  load,
  assignment,
  draft,
  error,
  onDraftChange,
  onClose,
  onSave
}: {
  load: FreightLoad;
  assignment?: LoadAssignment;
  draft: CompletionDraft;
  error: string;
  onDraftChange: (value: CompletionDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 px-4">
      <section className="w-full max-w-[720px] border border-white/[0.12] bg-terminal-950 p-4 shadow-2xl shadow-black/70">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Complete Load {load.id}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {load.pickup} {"->"} {load.delivery} / {assignment?.driverName ?? "No driver"}
            </p>
          </div>
          <IconButton label="Close completion form" className="h-9 w-9" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FormInput label="Score 1-5" value={draft.score} onChange={(score) => onDraftChange({ ...draft, score })} placeholder="5" />
          <FormInput label="Detention minutes" value={draft.detentionMinutes} onChange={(detentionMinutes) => onDraftChange({ ...draft, detentionMinutes })} placeholder="0" />
          <FormInput label="Proof / POD number" value={draft.proofNumber} onChange={(proofNumber) => onDraftChange({ ...draft, proofNumber })} placeholder="POD-1024" />
        </div>
        <label className="mt-3 block text-xs text-slate-500">
          Issue level
          <select
            value={draft.issueLevel}
            onChange={(event) => onDraftChange({ ...draft, issueLevel: event.target.value as CompletionDraft["issueLevel"] })}
            className="mt-1 h-9 w-full border border-white/[0.08] bg-[#050b1a] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35"
          >
            <option value="none">none</option>
            <option value="minor">minor</option>
            <option value="major">major</option>
          </select>
        </label>
        <label className="mt-3 block text-xs text-slate-500">
          Dispatcher comment
          <textarea value={draft.dispatcherComment} onChange={(event) => onDraftChange({ ...draft, dispatcherComment: event.target.value })} className="mt-1 min-h-20 w-full border border-white/[0.08] bg-white/[0.035] p-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35" />
        </label>
        <label className="mt-3 block text-xs text-slate-500">
          Driver note
          <textarea value={draft.driverComment} onChange={(event) => onDraftChange({ ...draft, driverComment: event.target.value })} className="mt-1 min-h-20 w-full border border-white/[0.08] bg-white/[0.035] p-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35" />
        </label>
        {error ? <div className="mt-3 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-slate-300">Cancel</button>
          <button type="button" onClick={onSave} className="h-9 border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm text-cyan-100">Save Completion</button>
        </div>
      </section>
    </div>
  );
}

function DriverAnalyticsModal({ driver, records, onClose }: { driver: DriverUnit; records: LoadAssignment[]; onClose: () => void }) {
  const completionRate = driver.loadsToday > 0 ? Math.round((driver.completedToday / driver.loadsToday) * 100) : 0;
  const averageScore = average(records.map((record) => record.score ?? 0).filter(Boolean));
  const metrics = [
    ["Loads today", String(driver.loadsToday)],
    ["Completed today", String(driver.completedToday)],
    ["Completion", `${completionRate}%`],
    ["Weekly loads", String(driver.weeklyLoads)],
    ["On-time rate", `${driver.onTimeRate}%`],
    ["Avg RPM", `$${driver.avgRpm.toFixed(2)}`],
    ["Completed records", String(records.length)],
    ["Avg driver score", records.length > 0 ? averageScore.toFixed(1) : "n/a"]
  ];

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-4">
      <section className="w-full max-w-[620px] border border-white/[0.12] bg-terminal-950 p-4 shadow-2xl shadow-black/70">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="min-w-0">
            <h2 className="whitespace-normal break-words text-lg font-semibold leading-7 text-slate-100">{driver.name} Analytics</h2>
            <p className="mt-1 text-sm text-slate-500">Daily and weekly driver performance snapshot.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={driver.status === "available" ? "green" : driver.status === "driving" ? "cyan" : "amber"}>{driver.status}</Badge>
            <IconButton label="Close analytics" className="h-9 w-9" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="border border-white/[0.08] bg-white/[0.035] p-3">
              <div className="text-[10px] uppercase tracking-[0.13em] text-slate-500">{label}</div>
              <div className="mt-1 font-mono text-lg font-semibold text-slate-100">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <InfoLine label="Phone" value={driver.phone} />
          <InfoLine label="Email" value={driver.email} />
          <InfoLine label="CDL / License" value={driver.license} />
          <InfoLine label="Truck" value={driver.truck} />
          <InfoLine label="Home terminal" value={driver.homeTerminal} />
        </div>
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Completed load history</h3>
          {records.length > 0 ? records.map((record) => (
            <div key={record.id} className="border border-white/[0.08] bg-white/[0.035] p-3 text-xs text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="font-mono text-cyan-200">{record.loadId}</span>
                <span className="font-mono text-emerald-300">{record.score}/5</span>
              </div>
              <p className="mt-2 text-slate-500">{record.dispatcherComment || "No dispatcher comment."}</p>
            </div>
          )) : <p className="text-xs text-slate-500">No completed loads recorded for this driver yet.</p>}
        </div>
      </section>
    </div>
  );
}

function AnalyticsTable({
  title,
  columns,
  rows
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="overflow-hidden border border-white/[0.08] bg-white/[0.025]">
      <div className="border-b border-white/[0.08] p-4">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="grid grid-cols-4 border-b border-white/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      {rows.length > 0 ? rows.map((row) => (
        <div key={row.join("-")} className="grid grid-cols-4 border-b border-white/[0.06] px-3 py-3 text-sm text-slate-300">
          {row.map((cell, index) => (
            <span key={`${cell}-${index}`} className={index === 0 ? "truncate font-semibold text-slate-100" : "font-mono"}>{cell}</span>
          ))}
        </div>
      )) : <div className="p-4 text-sm text-slate-500">No completed records in this range.</div>}
    </section>
  );
}

function AnalyticsBreakdown({
  title,
  items
}: {
  title: string;
  items: Array<[string, number, Tone]>;
}) {
  const total = items.reduce((sum, [, value]) => sum + value, 0);

  return (
    <section className="border border-white/[0.08] bg-white/[0.025] p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map(([label, value, tone]) => {
          const width = total > 0 ? Math.max(4, Math.round((value / total) * 100)) : 0;

          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <Badge tone={tone}>{label}</Badge>
                <span className="font-mono text-slate-200">{value}</span>
              </div>
              <div className="h-2 bg-white/[0.06]">
                <div className="h-full bg-cyan-300/60" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.03] p-4">
      <Badge tone={tone}>{label}</Badge>
      <div className="mt-3 font-mono text-2xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function ToolbarSearch({
  query,
  onQueryChange,
  placeholder
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-slate-400">
      <Search className="h-4 w-4" />
      <input value={query} onChange={(event) => onQueryChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500" placeholder={placeholder} />
      {query ? (
        <button type="button" onClick={() => onQueryChange("")} className="text-slate-500 hover:text-slate-200">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function SegmentedControl({
  values,
  active,
  onChange,
  className
}: {
  values: string[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onChange(value)} className={cn("h-9 border px-3 text-xs transition", active === value ? "border-violet-300/35 bg-violet-400/15 text-violet-100" : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-cyan-300/25 hover:text-cyan-100")}>
          {value}
        </button>
      ))}
    </div>
  );
}

function DataHeader({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div className={cn("grid h-10 items-center border-b border-white/[0.08] px-3 text-[11px] uppercase tracking-[0.14em] text-slate-500", columns)}>
      {labels.map((label) => <span key={label}>{label}</span>)}
    </div>
  );
}

function DetailPanel({
  title,
  rows,
  actions,
  onAction
}: {
  title: string;
  rows: Array<[string, string]>;
  actions: string[];
  onAction?: (action: string) => void;
}) {
  return (
    <aside className="border border-white/[0.08] bg-white/[0.025] p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <div className="mt-4 space-y-3 text-sm text-slate-300">
        {rows.map(([label, value]) => <InfoLine key={label} label={label} value={value} />)}
      </div>
      <div className="mt-4 space-y-2">
        {actions.map((action) => (
          <button key={action} type="button" onClick={() => onAction?.(action)} className="w-full border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-left text-sm text-slate-300 transition hover:border-violet-300/30 hover:bg-violet-400/10">
            {action}
          </button>
        ))}
      </div>
    </aside>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-3 block text-xs text-slate-500">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35" placeholder={placeholder} />
    </label>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: typeof PhoneCall; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-slate-300 hover:border-cyan-300/25">
      <Icon className="mr-2 inline h-4 w-4" />
      {label}
    </button>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/[0.06] pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getTrackerState(truck: TruckUnit): "moving" | "stopped" {
  if (truck.trackerState) {
    return truck.trackerState;
  }

  return truck.status === "loaded" ? "moving" : "stopped";
}

function trackerDraftFromTruck(truck?: TruckUnit): TrackerDraft {
  if (!truck) {
    return emptyTrackerDraft;
  }

  const [city = "", stateCode = ""] = truck.location.split(",").map((part) => part.trim());

  return {
    trackerState: getTrackerState(truck),
    trackerCity: truck.trackerCity ?? city,
    trackerStateCode: truck.trackerStateCode ?? stateCode,
    trackerNote: truck.trackerNote ?? ""
  };
}

function formatTrackerTime(value?: number) {
  if (!value) {
    return "not updated";
  }

  const minutes = Math.max(0, Math.round((Date.now() - value) / 60_000));

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return `${Math.round(minutes / 60)}h ago`;
}

function buildSearchCenterResults(
  query: string,
  category: string,
  trucks: TruckUnit[],
  drivers: DriverUnit[],
  assignments: LoadAssignment[]
) {
  const normalized = query.trim().toLowerCase();
  const results: SearchCenterResult[] = [];
  const includeCategory = (value: string) => category === "All" || category === value;
  const pushIfMatch = (categoryName: string, result: SearchCenterResult, haystack: string) => {
    if (!includeCategory(categoryName)) {
      return;
    }
    if (!normalized || haystack.toLowerCase().includes(normalized)) {
      results.push(result);
    }
  };

  mockLoads.slice(0, 120).forEach((load) => {
    const assignment = assignments.find((item) => item.loadId === load.id);
    pushIfMatch(
      "Loads",
      {
        id: `load-${load.id}`,
        title: `${load.id} / ${load.pickup} -> ${load.delivery}`,
        body: `${load.broker} / ${load.company} / ${load.phone} / ${load.equipment} / ${assignment?.driverName ?? "unassigned"}`,
        type: assignment?.status ?? load.status,
        tone: assignment?.status === "completed" ? "green" : assignment?.status === "assigned" ? "amber" : load.hot ? "red" : "cyan",
        page: "live-loads",
        query: load.id,
        loadId: load.id
      },
      `${load.id} ${load.pickup} ${load.delivery} ${load.broker} ${load.company} ${load.phone} ${load.equipment} ${assignment?.driverName ?? ""} ${assignment?.status ?? load.status}`
    );
  });

  drivers.forEach((driver) => {
    const activeAssignment = assignments.find((item) => item.status === "assigned" && item.driverName === driver.name);
    const truck = trucks.find((item) => item.driver === driver.name);
    pushIfMatch(
      "Drivers",
      {
        id: `driver-${driver.name}`,
        title: driver.name,
        body: `${driver.phone} / ${driver.license} / ${driver.location} / trailer ${truck?.id ?? driver.truck} / ${activeAssignment ? `load ${activeAssignment.loadId}` : driver.status}`,
        type: activeAssignment ? "assigned" : driver.status,
        tone: activeAssignment ? "cyan" : driver.status === "available" ? "green" : "amber",
        page: "drivers",
        query: driver.name
      },
      `${driver.name} ${driver.phone} ${driver.email} ${driver.license} ${driver.location} ${driver.homeTerminal} ${driver.status} ${truck?.id ?? driver.truck} ${activeAssignment?.loadId ?? ""}`
    );
  });

  trucks.forEach((truck) => {
    const activeAssignment = assignments.find((item) => item.status === "assigned" && item.driverName === truck.driver);
    const trackerState = getTrackerState(truck);
    pushIfMatch(
      "Trailers",
      {
        id: `truck-${truck.id}`,
        title: `${truck.id} / ${trackerState}`,
        body: `${truck.equipment} / ${truck.trackerCity ?? truck.location}${truck.trackerStateCode ? `, ${truck.trackerStateCode}` : ""} / ${truck.trackerNote ?? "no note"} / driver ${truck.driver}`,
        type: trackerState,
        tone: trackerState === "moving" ? "cyan" : truck.status === "service" ? "red" : "amber",
        page: "trucks",
        query: truck.id
      },
      `${truck.id} ${truck.equipment} ${truck.location} ${truck.status} ${truck.driver} ${truck.trackerCity ?? ""} ${truck.trackerStateCode ?? ""} ${truck.trackerNote ?? ""} ${trackerState} stopped moving in transit ${activeAssignment?.loadId ?? ""}`
    );
  });

  Object.values(mockBrokerProfiles).forEach((broker) => {
    pushIfMatch(
      "Brokers",
      {
        id: `broker-${broker.broker}`,
        title: broker.broker,
        body: `${broker.company} / ${broker.phone} / ${broker.email} / score ${broker.score}`,
        type: "broker",
        tone: broker.score >= 84 ? "green" : "amber",
        page: "brokers",
        query: broker.broker
      },
      `${broker.broker} ${broker.company} ${broker.phone} ${broker.email}`
    );
  });

  assignments.forEach((assignment) => {
    const load = mockLoads.find((item) => item.id === assignment.loadId);
    pushIfMatch(
      "Assignments",
      {
        id: `assignment-${assignment.id}`,
        title: `${assignment.loadId} / ${assignment.driverName}`,
        body: `${assignment.status} / ${load ? `${load.pickup} -> ${load.delivery}` : "load details unavailable"} / ${load?.broker ?? ""}`,
        type: assignment.status,
        tone: assignment.status === "completed" ? "green" : "amber",
        page: "assignments",
        query: assignment.loadId
      },
      `${assignment.loadId} ${assignment.driverName} ${assignment.status} ${load?.pickup ?? ""} ${load?.delivery ?? ""} ${load?.broker ?? ""}`
    );
  });

  return results.slice(0, 24);
}

function analyticsDetailRows(
  selectedMetric: string,
  context: {
    range: string;
    activeAssignments: LoadAssignment[];
    completedAssignments: LoadAssignment[];
    completionRate: number;
    avgScore: number;
    issueCounts: { none: number; minor: number; major: number };
    totalDetention: number;
    topDriver: string;
    topBroker: string;
  }
): Array<[string, string]> {
  const baseRows: Array<[string, string]> = [
    ["Range", context.range],
    ["Selected KPI", selectedMetric]
  ];

  if (selectedMetric === "Assigned Loads") {
    return [...baseRows, ["Active assignments", String(context.activeAssignments.length)], ["Next action", "Monitor driver progress"]];
  }
  if (selectedMetric === "Completed Loads") {
    return [...baseRows, ["Completed", String(context.completedAssignments.length)], ["Top driver", context.topDriver], ["Top broker", context.topBroker]];
  }
  if (selectedMetric === "Completion Rate") {
    return [...baseRows, ["Rate", `${context.completionRate}%`], ["Completed", String(context.completedAssignments.length)], ["Assigned", String(context.activeAssignments.length)]];
  }
  if (selectedMetric === "Avg Driver Score") {
    return [...baseRows, ["Average score", context.avgScore > 0 ? context.avgScore.toFixed(1) : "n/a"], ["Scoring model", "Dispatcher completion form"]];
  }
  if (selectedMetric === "Major Issues") {
    return [...baseRows, ["Major", String(context.issueCounts.major)], ["Minor", String(context.issueCounts.minor)], ["Clean", String(context.issueCounts.none)]];
  }
  if (selectedMetric === "Detention Minutes") {
    return [...baseRows, ["Total detention", `${context.totalDetention}m`], ["Source", "Completion records"]];
  }

  return baseRows;
}

function loadWorkflowLabel(
  loadId: string,
  claimedLoadIds: string[],
  watchedLoadIds: string[],
  calledLoadIds: string[],
  assignment?: LoadAssignment
) {
  const labels = [];

  if (assignment?.status === "completed") {
    labels.push("completed");
  } else if (assignment?.status === "assigned") {
    labels.push(`assigned to ${assignment.driverName}`);
  }
  if (claimedLoadIds.includes(loadId)) {
    labels.push("claimed");
  }
  if (watchedLoadIds.includes(loadId)) {
    labels.push("watched");
  }
  if (calledLoadIds.includes(loadId)) {
    labels.push("broker called");
  }

  return labels.length > 0 ? labels.join(" / ") : "new";
}

function humanizeSetting(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
