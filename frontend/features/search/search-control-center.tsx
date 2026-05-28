"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, RefreshCw, Search, Square, Trash2 } from "lucide-react";
import { searchApi } from "@/api/search-api";
import { trucksApi } from "@/api/trucks-api";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { SearchResultsTable } from "@/features/search/search-results-table";
import { useCompanyStore } from "@/store/company-store";
import { SearchBatch, SearchOverrides, SearchScoreResult, TruckSearchSession } from "@/types/search";
import { Truck } from "@/types/trucks";

const batchStorageKey = "freight-command-search-batch-ids";
const activeStatuses = new Set(["pending", "running"]);
const finalStatuses = new Set(["completed", "failed", "canceled", "cancelled", "timeout"]);

export function SearchControlCenter() {
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [minRpmOverride, setMinRpmOverride] = useState("");
  const [sourcesOverride, setSourcesOverride] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState("120");
  const [batchIds, setBatchIds] = useState<number[]>(() => readStoredBatchIds());
  const [batches, setBatches] = useState<Record<number, SearchBatch>>({});
  const [sessionsByBatch, setSessionsByBatch] = useState<Record<number, TruckSearchSession[]>>({});
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [scores, setScores] = useState<SearchScoreResult[]>([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresError, setScoresError] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedTruck = useMemo(
    () => trucks.find((truck) => String(truck.id) === selectedTruckId) ?? null,
    [selectedTruckId, trucks]
  );
  const sessions = useMemo(
    () => latestSessionsByTruck(batchIds.flatMap((batchId) => sessionsByBatch[batchId] ?? [])),
    [batchIds, sessionsByBatch]
  );
  const hasActiveSessions = sessions.some((session) => activeStatuses.has(session.status));
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions]
  );
  const selectedSessionRefreshKey = selectedSession ? `${selectedSession.id}:${selectedSession.status}:${selectedSession.updated_at}` : "";

  const refreshBatches = useCallback(async (batchIdsOverride?: number[]) => {
    const idsToRefresh = batchIdsOverride ?? batchIds;

    if (idsToRefresh.length === 0) {
      setBatches({});
      setSessionsByBatch({});
      return;
    }

    try {
      const settledEntries = await Promise.allSettled(
        idsToRefresh.map(async (batchId) => {
          const [batch, batchSessions] = await Promise.all([
            searchApi.getSearchBatch(batchId),
            searchApi.getTruckSessionsForBatch(batchId)
          ]);
          return { batch, sessions: batchSessions };
        })
      );
      const batchEntries = settledEntries
        .filter((entry): entry is PromiseFulfilledResult<{ batch: SearchBatch; sessions: TruckSearchSession[] }> => entry.status === "fulfilled")
        .map((entry) => entry.value)
        .filter((entry) => entry.sessions.length > 0);

      setBatches(Object.fromEntries(batchEntries.map((entry) => [entry.batch.id, entry.batch])));
      setSessionsByBatch(Object.fromEntries(batchEntries.map((entry) => [entry.batch.id, entry.sessions])));
      setBatchIds((items) => {
        const nextItems = idsToRefresh.filter((batchId) => batchEntries.some((entry) => entry.batch.id === batchId));
        return areSameNumberList(items, nextItems) ? items : nextItems;
      });
    } catch (requestError) {
      setError(getMessage(requestError, "Search sessions could not be refreshed."));
    }
  }, [batchIds]);

  useEffect(() => {
    if (!activeCompanyId) {
      setTrucks([]);
      return;
    }

    setLoading(true);
    setError("");
    trucksApi
      .listTrucks(activeCompanyId)
      .then((items) => {
        setTrucks(items);
        setSelectedTruckId((current) => current || (items[0] ? String(items[0].id) : ""));
      })
      .catch((requestError) => setError(getMessage(requestError, "Trucks could not be loaded.")))
      .finally(() => setLoading(false));
  }, [activeCompanyId]);

  useEffect(() => {
    persistBatchIds(batchIds);
    refreshBatches();
  }, [batchIds, refreshBatches]);

  useEffect(() => {
    if (!hasActiveSessions) {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshBatches();
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [hasActiveSessions, refreshBatches]);

  useEffect(() => {
    if (!selectedSession && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSession, sessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setScores([]);
      setScoresError("");
      return;
    }

    loadScores(selectedSessionId);
  }, [selectedSessionId, selectedSessionRefreshKey]);

  async function startSearch() {
    if (!activeCompanyId || !selectedTruck) {
      setError("Select an active company and truck before starting search.");
      return;
    }

    setStarting(true);
    setError("");
    setSuccess("");

    try {
      const batch = await searchApi.startSearch({
        company_id: activeCompanyId,
        truck_ids: [selectedTruck.id],
        overrides: buildOverrides(minRpmOverride, sourcesOverride),
        timeout_seconds: parseOptionalInt(timeoutSeconds) ?? 120
      });
      const newSessions = await searchApi.getTruckSessionsForBatch(batch.id);
      const nextBatchIds = [batch.id, ...batchIds.filter((item) => item !== batch.id)].slice(0, 12);
      setBatchIds(nextBatchIds);
      setBatches((items) => ({ ...items, [batch.id]: batch }));
      setSessionsByBatch((items) => {
        const nextItems = Object.fromEntries(
          Object.entries(items).map(([batchId, sessions]) => [
            Number(batchId),
            sessions.filter((session) => session.truck_id !== selectedTruck.id)
          ])
        );

        return { ...nextItems, [batch.id]: newSessions };
      });
      setSelectedSessionId(newSessions[0]?.id ?? null);
      setSuccess("Search started.");
      await refreshBatches(nextBatchIds);
    } catch (requestError) {
      setError(getMessage(requestError, "Search could not be started."));
    } finally {
      setStarting(false);
    }
  }

  async function cancelSession(sessionId: number) {
    setError("");
    try {
      await searchApi.cancelTruckSearchSession(sessionId);
      await refreshBatches();
    } catch (requestError) {
      setError(getMessage(requestError, "Search session could not be cancelled."));
    }
  }

  async function clearSession(session: TruckSearchSession) {
    setError("");
    try {
      await searchApi.deleteTruckSearchSession(session.id);
      setSessionsByBatch((items) => {
        const remaining = (items[session.search_batch_id] ?? []).filter((item) => item.id !== session.id);
        return { ...items, [session.search_batch_id]: remaining };
      });
      setBatchIds((items) => {
        const remainingSessions = (sessionsByBatch[session.search_batch_id] ?? []).filter((item) => item.id !== session.id);
        return remainingSessions.length === 0 ? items.filter((batchId) => batchId !== session.search_batch_id) : items;
      });
      if (selectedSessionId === session.id) {
        setSelectedSessionId(null);
        setScores([]);
      }
      await refreshBatches();
    } catch (requestError) {
      setError(getMessage(requestError, "Search session could not be cleared."));
    }
  }

  async function loadScores(sessionId: number) {
    setScoresLoading(true);
    setScoresError("");

    try {
      const items = await searchApi.getTruckSearchSessionScores(sessionId);
      setScores([...items].sort((left, right) => right.score - left.score));
    } catch (requestError) {
      setScores([]);
      setScoresError(getMessage(requestError, "Scored loads could not be loaded."));
    } finally {
      setScoresLoading(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="overflow-auto border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="mb-4 flex items-center gap-2">
          <IconButton label="Search setup" className="h-9 w-9">
            <Search className="h-4 w-4" />
          </IconButton>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Start Search</h2>
            <p className="mt-1 text-xs text-slate-500">Select a truck, review defaults, and apply temporary overrides.</p>
          </div>
        </div>

        <label className="block text-xs text-slate-500">
          Truck
          <select
            value={selectedTruckId}
            onChange={(event) => setSelectedTruckId(event.target.value)}
            className="mt-1 h-10 w-full border border-white/[0.08] bg-[#050b1a] px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/35"
          >
            <option value="">Select truck</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.truck_id} / {truck.status}
              </option>
            ))}
          </select>
        </label>

        {selectedTruck ? <TruckDefaultsPreview truck={selectedTruck} /> : <div className="mt-4 border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-slate-500">{loading ? "Loading trucks..." : "No truck selected."}</div>}

        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Temporary overrides</div>
          <Input label="Min RPM" value={minRpmOverride} onChange={setMinRpmOverride} placeholder={selectedTruck?.min_rpm ? String(selectedTruck.min_rpm) : "2.50"} />
          <Input label="Preferred broker sources" value={sourcesOverride} onChange={setSourcesOverride} placeholder={(selectedTruck?.preferred_broker_sources ?? []).join(", ") || "DAT"} />
          <Input label="Timeout seconds" value={timeoutSeconds} onChange={setTimeoutSeconds} placeholder="120" />
        </div>

        {error ? <div className="mt-4 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
        {success ? <div className="mt-4 border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">{success}</div> : null}

        <button
          type="button"
          onClick={startSearch}
          disabled={!selectedTruck || starting}
          className="mt-5 flex h-10 w-full items-center justify-center gap-2 border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {starting ? "Starting..." : "Start Search"}
        </button>
      </aside>

      <section className="min-h-0 overflow-auto border border-white/[0.08] bg-white/[0.025]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Running Search Sessions</h2>
            <p className="mt-1 text-xs text-slate-500">Polls active batches every four seconds until sessions reach a final status.</p>
          </div>
          <button type="button" onClick={() => refreshBatches()} className="flex h-9 items-center gap-2 border border-white/[0.08] bg-white/[0.035] px-3 text-xs text-slate-300 hover:border-cyan-300/25">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {sessions.length === 0 ? <div className="p-5 text-sm text-slate-500">No search sessions started yet.</div> : null}

        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              batch={batches[session.search_batch_id]}
              truck={trucks.find((truck) => truck.id === session.truck_id)}
              selected={session.id === selectedSessionId}
              onSelect={() => setSelectedSessionId(session.id)}
              onCancel={() => cancelSession(session.id)}
              onClear={() => clearSession(session)}
            />
          ))}
        </div>
        <div className="border-t border-white/[0.08]">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Ranked Search Results</h2>
              <p className="mt-1 text-xs text-slate-500">
                {selectedSession ? `Session #${selectedSession.id}` : "Select a search session to view scored loads."}
              </p>
            </div>
            {selectedSession ? <Badge tone={statusTone(selectedSession.status)}>{selectedSession.status}</Badge> : null}
          </div>
          {selectedSession ? (
            <SearchResultsTable truckSearchSessionId={selectedSession.id} scores={scores} loading={scoresLoading} error={scoresError} />
          ) : (
            <div className="border-t border-white/[0.08] p-5 text-sm text-slate-500">Select a session to view scored loads.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function TruckDefaultsPreview({ truck }: { truck: Truck }) {
  return (
    <div className="mt-4 border border-cyan-300/15 bg-cyan-300/[0.06] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Truck defaults</span>
        <Badge tone={truck.status === "available" ? "green" : "amber"}>{truck.status}</Badge>
      </div>
      <div className="space-y-2 text-sm">
        <InfoLine label="Truck" value={truck.truck_id} />
        <InfoLine label="Equipment" value={truck.equipment_type ?? "not set"} />
        <InfoLine label="Location" value={truck.current_location ?? "not set"} />
        <InfoLine label="Available" value={truck.available_from ?? "not set"} />
        <InfoLine label="Deadhead" value={truck.max_deadhead_miles ? `${truck.max_deadhead_miles} mi` : "not set"} />
        <InfoLine label="Min RPM" value={truck.min_rpm ? `$${truck.min_rpm.toFixed(2)}` : "not set"} />
        <InfoLine label="Max weight" value={truck.max_weight ? `${truck.max_weight.toLocaleString()} lb` : "not set"} />
        <InfoLine label="Sources" value={(truck.preferred_broker_sources ?? []).join(", ") || "not set"} />
      </div>
    </div>
  );
}

function SessionCard({
  session,
  batch,
  truck,
  selected,
  onSelect,
  onCancel,
  onClear
}: {
  session: TruckSearchSession;
  batch?: SearchBatch;
  truck?: Truck;
  selected: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const isFinal = finalStatuses.has(session.status);
  const isActive = activeStatuses.has(session.status);

  return (
    <article className={`border bg-terminal-950/70 p-4 ${selected ? "border-cyan-300/35" : "border-white/[0.08]"}`}>
      <button type="button" onClick={onSelect} className="mb-3 flex w-full items-start justify-between gap-3 text-left">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{truck?.truck_id ?? `Truck #${session.truck_id}`}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">Session #{session.id} / Batch #{session.search_batch_id}</p>
        </div>
        <Badge tone={statusTone(session.status)}>{session.status}</Badge>
      </button>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <InfoLine label="Started" value={formatDate(session.started_at ?? session.created_at)} />
        <InfoLine label="Completed" value={session.completed_at ? formatDate(session.completed_at) : "in progress"} />
        <InfoLine label="Timeout" value={session.timeout_seconds ? `${session.timeout_seconds}s` : batch?.timeout_seconds ? `${batch.timeout_seconds}s` : "not set"} />
        <InfoLine label="Owner" value={`User #${session.owner_user_id}`} />
      </div>
      {session.error_message ? <div className="mt-3 border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{session.error_message}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        {isActive ? (
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center gap-2 border border-red-400/20 bg-red-400/10 px-3 text-xs text-red-200 hover:border-red-300/30"
          >
            <Square className="h-3.5 w-3.5" />
            Cancel
          </button>
        ) : null}
        {isFinal ? (
          <button
            type="button"
            onClick={onClear}
            className="flex h-9 items-center gap-2 border border-white/[0.08] bg-white/[0.035] px-3 text-xs text-slate-300 hover:border-cyan-300/25 hover:text-cyan-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        ) : null}
      </div>
    </article>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="mt-3 block text-xs text-slate-500">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full border border-white/[0.08] bg-white/[0.035] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35" placeholder={placeholder} />
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/[0.06] pb-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-mono text-slate-200">{value}</span>
    </div>
  );
}

function buildOverrides(minRpm: string, sources: string): SearchOverrides | undefined {
  const overrides: SearchOverrides = {};
  const parsedMinRpm = parseOptionalFloat(minRpm);
  const parsedSources = sources.split(",").map((source) => source.trim()).filter(Boolean);

  if (parsedMinRpm !== null) {
    overrides.min_rpm = parsedMinRpm;
  }
  if (parsedSources.length > 0) {
    overrides.preferred_broker_sources = parsedSources;
  }

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function parseOptionalFloat(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusTone(status: string): "green" | "cyan" | "amber" | "red" | "violet" | "slate" {
  if (status === "completed") {
    return "green";
  }
  if (status === "failed" || status === "timeout") {
    return "red";
  }
  if (status === "canceled" || status === "cancelled") {
    return "amber";
  }
  if (status === "running") {
    return "cyan";
  }

  return "violet";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function latestSessionsByTruck(sessions: TruckSearchSession[]) {
  const latestByTruck = new Map<number, TruckSearchSession>();

  [...sessions]
    .sort((left, right) => sessionTime(right) - sessionTime(left))
    .forEach((session) => {
      if (!latestByTruck.has(session.truck_id)) {
        latestByTruck.set(session.truck_id, session);
      }
    });

  return [...latestByTruck.values()].sort((left, right) => sessionTime(right) - sessionTime(left));
}

function sessionTime(session: TruckSearchSession) {
  return new Date(session.started_at ?? session.created_at).getTime();
}

function readStoredBatchIds() {
  if (typeof window === "undefined") {
    return [];
  }

  const value = window.localStorage.getItem(batchStorageKey);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === "number" && Number.isFinite(item)) : [];
  } catch {
    return [];
  }
}

function persistBatchIds(batchIds: number[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(batchStorageKey, JSON.stringify(batchIds));
}

function areSameNumberList(left: number[], right: number[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function getMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
