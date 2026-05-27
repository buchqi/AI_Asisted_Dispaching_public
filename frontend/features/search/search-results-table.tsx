"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchScoreResult, ScoreBreakdownItem } from "@/types/search";

const breakdownOrder = ["posted_rate", "rpm", "mileage", "origin", "destination", "broker", "driver_preferences"];

export function SearchResultsTable({
  scores,
  loading,
  error
}: {
  scores: SearchScoreResult[];
  loading: boolean;
  error: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const rankedScores = [...scores].sort((left, right) => right.score - left.score);

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
        <div className="grid grid-cols-[56px_86px_160px_160px_160px_110px_110px_90px_90px_100px_110px_110px] border-b border-white/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
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
        </div>
        {rankedScores.map((score, index) => {
          const expanded = expandedIds.has(score.id);
          const snapshot = score.load_snapshot;

          return (
            <div key={score.id} className="border-b border-white/[0.06]">
              <button
                type="button"
                onClick={() => setExpandedIds((items) => toggleSet(items, score.id))}
                className="grid w-full grid-cols-[56px_86px_160px_160px_160px_110px_110px_90px_90px_100px_110px_110px] items-center px-3 py-3 text-left text-sm text-slate-300 hover:bg-cyan-300/[0.04]"
              >
                <span className="flex items-center gap-1 font-mono text-slate-500">
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  #{index + 1}
                </span>
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
              </button>
              {expanded ? <ScoreBreakdown breakdown={score.breakdown} /> : null}
            </div>
          );
        })}
      </div>
    </div>
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

