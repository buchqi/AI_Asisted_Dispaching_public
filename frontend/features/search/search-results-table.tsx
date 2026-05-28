"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, PhoneCall, Save, Star, XCircle, type LucideIcon } from "lucide-react";
import { dispatcherActionsApi, type DispatcherLoadActionType } from "@/api/dispatcher-actions-api";
import { Badge } from "@/components/ui/badge";
import { SearchScoreResult, ScoreBreakdownItem } from "@/types/search";

const breakdownOrder = ["posted_rate", "rpm", "mileage", "origin", "destination", "broker", "driver_preferences"];
const actionOrder: LoadActionType[] = ["save", "favorite", "reject", "contacted"];
const actionConfig = {
  save: {
    label: "Save",
    completedLabel: "Saved",
    Icon: Save,
    run: dispatcherActionsApi.saveLoad
  },
  reject: {
    label: "Reject",
    completedLabel: "Rejected",
    Icon: XCircle,
    run: dispatcherActionsApi.rejectLoad
  },
  favorite: {
    label: "Favorite",
    completedLabel: "Favorited",
    Icon: Star,
    run: dispatcherActionsApi.favoriteLoad
  },
  contacted: {
    label: "Contacted",
    completedLabel: "Contacted",
    Icon: PhoneCall,
    run: dispatcherActionsApi.markLoadContacted
  }
} satisfies Record<LoadActionType, LoadActionConfig>;

type LoadActionType = "save" | "reject" | "favorite" | "contacted";
type ActionKey = `${number}:${LoadActionType}`;
type LoadActionConfig = {
  label: string;
  completedLabel: string;
  Icon: LucideIcon;
  run: (truckSearchSessionId: number | string, loadId: number | string) => Promise<unknown>;
};

export function SearchResultsTable({
  truckSearchSessionId,
  scores,
  loading,
  error
}: {
  truckSearchSessionId: number;
  scores: SearchScoreResult[];
  loading: boolean;
  error: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [activeActions, setActiveActions] = useState<Record<number, LoadActionType | null>>({});
  const [loadingActions, setLoadingActions] = useState<Set<ActionKey>>(new Set());
  const [actionErrors, setActionErrors] = useState<Record<number, string>>({});
  const rankedScores = [...scores].sort((left, right) => right.score - left.score);

  useEffect(() => {
    setActiveActions(
      Object.fromEntries(
        scores.map((score) => [
          score.load_id,
          getActiveActionFromScore(score)
        ])
      )
    );
  }, [scores]);

  async function actOnLoad(loadId: number, action: LoadActionType) {
    const actionKey = getActionKey(loadId, action);
    const activeAction = activeActions[loadId] ?? null;

    setLoadingActions((items) => addSetItem(items, actionKey));
    setActionErrors((items) => clearRecordKey(items, loadId));

    try {
      const response = activeAction === action
        ? await dispatcherActionsApi.clearLoadAction(truckSearchSessionId, loadId)
        : await actionConfig[action].run(truckSearchSessionId, loadId);

      setActiveActions((items) => ({
        ...items,
        [loadId]: getActiveActionFromActionType(response.action_type)
      }));
    } catch (requestError) {
      setActionErrors((items) => ({
        ...items,
        [loadId]: getMessage(requestError, "Load action failed.")
      }));
    } finally {
      setLoadingActions((items) => removeSetItem(items, actionKey));
    }
  }

  if (loading) {
    return <div className="border-t border-white/[0.08] p-5 text-sm text-slate-500">Loading scored loads...</div>;
  }

  if (error) {
    return <div className="border-t border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>;
  }

  if (rankedScores.length === 0) {
    return <div className="border-t border-white/[0.08] p-5 text-sm text-slate-500">No scored loads yet for this session.</div>;
  }

  return (
    <div className="overflow-auto border-t border-white/[0.08]">
      <div className="min-w-[1160px]">
        <div className="grid grid-cols-[56px_86px_160px_160px_160px_110px_110px_90px_90px_100px_110px_110px_350px] border-b border-white/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <span>Rank</span>
          <span>Score</span>
          <span>Broker / Source</span>
          <span>Origin</span>
          <span>Destination</span>
          <span>Pickup</span>
          <span>Rate</span>
          <span>Miles</span>
          <span>RPM</span>
          <span>Deadhead</span>
          <span>Weight</span>
          <span>Equipment</span>
          <span>Actions</span>
        </div>
        {rankedScores.map((score, index) => {
          const expanded = expandedIds.has(score.id);
          const snapshot = score.load_snapshot;
          const loadId = score.load_id;

          return (
            <div key={score.id} className="border-b border-white/[0.06]">
              <div
                className="grid w-full grid-cols-[56px_86px_160px_160px_160px_110px_110px_90px_90px_100px_110px_110px_350px] items-center px-3 py-3 text-left text-sm text-slate-300 hover:bg-cyan-300/[0.04]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedIds((items) => toggleSet(items, score.id))}
                  className="flex items-center gap-1 font-mono text-slate-500 hover:text-cyan-100"
                >
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  #{index + 1}
                </button>
                <span><Badge tone={score.score >= 80 ? "green" : score.score >= 50 ? "cyan" : "amber"}>{score.score.toFixed(1)}</Badge></span>
                <span className="truncate">
                  <span className="block font-semibold text-slate-100">{snapshot.broker ?? "Unknown broker"}</span>
                  <span className="text-xs text-slate-500">{snapshot.source ?? "unknown"}</span>
                </span>
                <span className="truncate">{snapshot.origin ?? "not set"}</span>
                <span className="truncate">{snapshot.destination ?? "not set"}</span>
                <span className="font-mono text-xs">{formatDate(snapshot.pickup_date)}</span>
                <span className="font-mono">{formatCurrency(snapshot.posted_rate)}</span>
                <span className="font-mono">{formatNumber(snapshot.miles)}</span>
                <span className="font-mono">{snapshot.rpm ? `$${snapshot.rpm.toFixed(2)}` : "n/a"}</span>
                <span className="font-mono">{formatNumber(snapshot.deadhead_miles)}</span>
                <span className="font-mono">{formatNumber(snapshot.weight)}</span>
                <span className="truncate">{snapshot.equipment_type ?? "not set"}</span>
                <LoadActionButtons
                  loadId={loadId}
                  activeAction={activeActions[loadId] ?? null}
                  loadingActions={loadingActions}
                  onAction={actOnLoad}
                />
              </div>
              {actionErrors[loadId] ? <div className="px-3 pb-3 text-xs text-red-200">{actionErrors[loadId]}</div> : null}
              {expanded ? <ScoreBreakdown breakdown={score.breakdown} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadActionButtons({
  loadId,
  activeAction,
  loadingActions,
  onAction
}: {
  loadId: number;
  activeAction: LoadActionType | null;
  loadingActions: Set<ActionKey>;
  onAction: (loadId: number, action: LoadActionType) => void;
}) {
  return (
    <span className="grid w-[176px] grid-cols-2 gap-2">
      {actionOrder.map((action) => {
        const config = actionConfig[action];
        const selected = activeAction === action;
        const actionLoading = loadingActions.has(getActionKey(loadId, action));
        const loadLoading = [...loadingActions].some((item) => item.startsWith(`${loadId}:`));
        const Icon = config.Icon;

        return (
          <button
            type="button"
            key={action}
            disabled={loadLoading}
            onClick={(event) => {
              event.stopPropagation();
              onAction(loadId, action);
            }}
            className={`inline-flex h-8 min-w-[76px] items-center justify-center gap-1.5 border px-2 text-xs font-medium ${
              selected
                ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-100"
                : "border-white/[0.08] bg-white/[0.035] text-slate-300 hover:border-cyan-300/25 hover:text-cyan-100"
            } ${loadLoading ? "cursor-wait opacity-70" : ""}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {actionLoading ? "..." : selected ? config.completedLabel : config.label}
          </button>
        );
      })}
    </span>
  );
}

function ScoreBreakdown({ breakdown }: { breakdown: SearchScoreResult["breakdown"] }) {
  return (
    <div className="bg-white/[0.02] px-4 py-3">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {breakdownOrder.map((key) => (
          <BreakdownCard key={key} label={key} item={breakdown?.[key]} />
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({ label, item }: { label: string; item?: ScoreBreakdownItem }) {
  return (
    <div className="border border-white/[0.08] bg-terminal-950/60 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-[0.12em] text-slate-500">{label.replace(/_/g, " ")}</span>
        <span className="font-mono text-cyan-200">{typeof item?.points === "number" ? item.points.toFixed(1) : "0.0"} pts</span>
      </div>
      <div className="font-mono text-slate-300">{formatBreakdownValue(item?.value)}</div>
      <p className="mt-2 text-slate-500">{item?.reason ?? "No scoring note."}</p>
    </div>
  );
}

function toggleSet(items: Set<number>, id: number) {
  const nextItems = new Set(items);
  if (nextItems.has(id)) {
    nextItems.delete(id);
  } else {
    nextItems.add(id);
  }

  return nextItems;
}

function addSetItem<T>(items: Set<T>, item: T) {
  const nextItems = new Set(items);
  nextItems.add(item);
  return nextItems;
}

function removeSetItem<T>(items: Set<T>, item: T) {
  const nextItems = new Set(items);
  nextItems.delete(item);
  return nextItems;
}

function clearRecordKey<T>(items: Record<number, T>, key: number) {
  const nextItems = { ...items };
  delete nextItems[key];
  return nextItems;
}

function getActionKey(loadId: number, action: LoadActionType): ActionKey {
  return `${loadId}:${action}`;
}

function getActiveActionFromScore(score: SearchScoreResult): LoadActionType | null {
  const activeAction = score.action_state?.active_action_type;
  if (isLoadActionType(activeAction)) {
    return activeAction;
  }

  return null;
}

function getActiveActionFromActionType(actionType: DispatcherLoadActionType): LoadActionType | null {
  return isLoadActionType(actionType) ? actionType : null;
}

function isLoadActionType(value: unknown): value is LoadActionType {
  return value === "save" || value === "reject" || value === "favorite" || value === "contacted";
}

function getMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function formatDate(value: string | null) {
  if (!value) {
    return "n/a";
  }

  return new Date(value).toLocaleDateString();
}

function formatCurrency(value: number | null) {
  return typeof value === "number" ? `$${value.toLocaleString()}` : "n/a";
}

function formatNumber(value: number | null) {
  return typeof value === "number" ? value.toLocaleString() : "n/a";
}

function formatBreakdownValue(value: unknown) {
  if (value === null || value === undefined) {
    return "n/a";
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}
