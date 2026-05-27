"use client";

import { RotateCcw, Save, Search, SlidersHorizontal } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useWorkspaceStore } from "@/store/workspace-store";

const lanes = ["All", "Southeast", "TX Outbound", "Midwest", "East Coast", "West Coast"];
const equipment = ["All", "Dry Van", "Reefer", "Flatbed", "Power Only", "Step Deck"];
const brokerScores = [0, 70, 75, 80, 85, 90];
const decisions = ["All", "new", "accepted", "rejected"];

// FilterStrip is the fast operator control area.
// It applies directly to the Dispatch Workspace table.
export function FilterStrip() {
  const laneFilter = useWorkspaceStore((state) => state.laneFilter);
  const equipmentFilter = useWorkspaceStore((state) => state.equipmentFilter);
  const minRpm = useWorkspaceStore((state) => state.minRpm);
  const maxDeadhead = useWorkspaceStore((state) => state.maxDeadhead);
  const minBrokerScore = useWorkspaceStore((state) => state.minBrokerScore);
  const maxWeight = useWorkspaceStore((state) => state.maxWeight);
  const activeLoadDate = useWorkspaceStore((state) => state.activeLoadDate);
  const decisionFilter = useWorkspaceStore((state) => state.decisionFilter);
  const setLaneFilter = useWorkspaceStore((state) => state.setLaneFilter);
  const setEquipmentFilter = useWorkspaceStore((state) => state.setEquipmentFilter);
  const setMinRpm = useWorkspaceStore((state) => state.setMinRpm);
  const setMaxDeadhead = useWorkspaceStore((state) => state.setMaxDeadhead);
  const setMinBrokerScore = useWorkspaceStore((state) => state.setMinBrokerScore);
  const setMaxWeight = useWorkspaceStore((state) => state.setMaxWeight);
  const setActiveLoadDate = useWorkspaceStore((state) => state.setActiveLoadDate);
  const setDecisionFilter = useWorkspaceStore((state) => state.setDecisionFilter);
  const saveFilterPreset = useWorkspaceStore((state) => state.saveFilterPreset);
  const resetFilters = useWorkspaceStore((state) => state.resetFilters);

  return (
    <div className="flex min-h-12 flex-wrap items-center gap-2 border border-white/[0.08] bg-terminal-900/80 px-3 py-2">
      <div className="flex items-center gap-2 pr-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
        Filters
      </div>

      <FilterSelect label="Lane" value={laneFilter} values={lanes} onChange={setLaneFilter} />
      <FilterSelect label="Equipment" value={equipmentFilter} values={equipment} onChange={setEquipmentFilter} />
      <FilterSelect label="Decision" value={decisionFilter} values={decisions} onChange={(value) => setDecisionFilter(value as typeof decisionFilter)} />

      <label className="flex items-center gap-2 text-xs text-slate-500">
        Day
        <input
          type="date"
          value={activeLoadDate}
          onChange={(event) => setActiveLoadDate(event.target.value)}
          className="h-8 border border-white/[0.08] bg-[#050b1a] px-2 font-mono text-xs text-slate-200 outline-none focus:border-cyan-300/35"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-500">
        RPM
        <input
          type="number"
          value={minRpm}
          min={0}
          step={0.05}
          onChange={(event) => setMinRpm(Number(event.target.value))}
          className="h-8 w-20 border border-white/[0.08] bg-white/[0.035] px-2 font-mono text-xs text-slate-200 outline-none focus:border-cyan-300/35"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-500">
        DH
        <input
          type="number"
          value={maxDeadhead}
          min={0}
          step={5}
          onChange={(event) => setMaxDeadhead(Number(event.target.value))}
          className="h-8 w-20 border border-white/[0.08] bg-white/[0.035] px-2 font-mono text-xs text-slate-200 outline-none focus:border-cyan-300/35"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-500">
        Broker
        <select value={minBrokerScore} onChange={(event) => setMinBrokerScore(Number(event.target.value))} className="h-8 border border-white/[0.08] bg-[#050b1a] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35">
          {brokerScores.map((score) => <option key={score} value={score}>{score === 0 ? "Any" : `${score}+`}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-slate-500">
        Weight
        <input
          type="number"
          value={maxWeight}
          min={0}
          step={1000}
          onChange={(event) => setMaxWeight(Number(event.target.value))}
          className="h-8 w-24 border border-white/[0.08] bg-white/[0.035] px-2 font-mono text-xs text-slate-200 outline-none focus:border-cyan-300/35"
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <IconButton label="Apply filters" className="h-9 w-9">
          <Search className="h-4 w-4" />
        </IconButton>
        <IconButton label="Save filter preset" className="h-9 w-9" onClick={saveFilterPreset}>
          <Save className="h-4 w-4" />
        </IconButton>
        <IconButton label="Reset filters" className="h-9 w-9" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-8 border border-white/[0.08] bg-[#050b1a] px-2 text-xs text-slate-200 outline-none focus:border-cyan-300/35">
        {values.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}
