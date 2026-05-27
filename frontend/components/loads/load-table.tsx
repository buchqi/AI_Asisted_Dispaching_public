"use client";

import { useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Flame, GripVertical, PhoneCall, RotateCcw, X } from "lucide-react";
import { FreightLoad } from "@/entities/load/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, cn } from "@/shared/lib/utils";
import { useWorkspaceStore } from "@/store/workspace-store";

// Maps each operational load status to a badge tone.
const statusTone = {
  new: "cyan",
  watching: "amber",
  claimed: "green",
  calling: "violet",
  stale: "slate"
} as const;

// LoadTable is the core product surface.
// It uses TanStack Table for column definitions and React Virtual for fast scrolling.
export function LoadTable({
  loads,
  changedLoadId
}: {
  loads: FreightLoad[];
  changedLoadId: string | null;
}) {
  // Selecting a row opens the intelligence drawer.
  const selectLoad = useWorkspaceStore((state) => state.selectLoad);
  // Selected row ID is used to visually mark the active row.
  const selectedLoadId = useWorkspaceStore((state) => state.selectedLoadId);
  const loadDecisions = useWorkspaceStore((state) => state.loadDecisions);
  const acceptLoad = useWorkspaceStore((state) => state.acceptLoad);
  const rejectLoad = useWorkspaceStore((state) => state.rejectLoad);
  const reopenLoad = useWorkspaceStore((state) => state.reopenLoad);
  const [rejectTarget, setRejectTarget] = useState<FreightLoad | null>(null);
  const [rejectReason, setRejectReason] = useState("Rate too low");
  const [rejectNote, setRejectNote] = useState("");
  // Scroll container ref is required by React Virtual.
  const parentRef = useRef<HTMLDivElement>(null);

  // Column definitions describe how each freight field appears in the table.
  // useMemo keeps the columns stable so the table does not rebuild them on every render.
  const columns = useMemo<ColumnDef<FreightLoad>[]>(
    () => [
      {
        header: "Age",
        accessorKey: "ageMinutes",
        size: 72,
        cell: ({ row }) => <span className="font-mono text-slate-300">{row.original.ageMinutes}m</span>
      },
      {
        header: "Pickup",
        accessorKey: "pickup",
        size: 156,
        cell: ({ row }) => <LocationCell value={row.original.pickup} hot={row.original.hot} />
      },
      {
        header: "Delivery",
        accessorKey: "delivery",
        size: 162,
        cell: ({ row }) => <span className="text-slate-200">{row.original.delivery}</span>
      },
      {
        header: "RPM",
        accessorKey: "rpm",
        size: 88,
        cell: ({ row }) => (
          <span className={cn("font-mono font-semibold", row.original.rpm >= 2.75 ? "text-emerald-300" : "text-slate-200")}>
            ${row.original.rpm.toFixed(2)}
          </span>
        )
      },
      {
        header: "Miles",
        accessorKey: "miles",
        size: 88,
        cell: ({ row }) => <Mono>{formatNumber(row.original.miles)}</Mono>
      },
      {
        header: "DH",
        accessorKey: "deadhead",
        size: 74,
        cell: ({ row }) => <Mono>{row.original.deadhead}</Mono>
      },
      {
        header: "Weight",
        accessorKey: "weight",
        size: 96,
        cell: ({ row }) => <Mono>{formatNumber(row.original.weight)}</Mono>
      },
      {
        header: "Equip",
        accessorKey: "equipment",
        size: 112,
        cell: ({ row }) => <Badge tone="slate">{row.original.equipment}</Badge>
      },
      {
        header: "Broker",
        accessorKey: "broker",
        size: 150,
        cell: ({ row }) => <span className="font-medium text-slate-100">{row.original.broker}</span>
      },
      {
        header: "Company",
        accessorKey: "company",
        size: 170
      },
      {
        header: "Phone",
        accessorKey: "phone",
        size: 140,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 font-mono text-cyan-200">
            <PhoneCall className="h-3.5 w-3.5" />
            {row.original.phone}
          </span>
        )
      },
      {
        header: "Rate",
        accessorKey: "rate",
        size: 98,
        cell: ({ row }) => <span className="font-mono font-semibold text-slate-50">{formatCurrency(row.original.rate)}</span>
      },
      {
        header: "Posted",
        accessorKey: "postedTime",
        size: 100,
        cell: ({ row }) => <Mono>{row.original.postedTime}</Mono>
      },
      {
        header: "Source",
        accessorKey: "source",
        size: 96,
        cell: ({ row }) => <Badge tone="violet">{row.original.source}</Badge>
      },
      {
        header: "Status",
        accessorKey: "status",
        size: 104,
        cell: ({ row }) => {
          const decision = loadDecisions[row.original.id];

          if (decision?.status) {
            return <Badge tone={decision.status === "accepted" ? "green" : "red"}>{decision.status}</Badge>;
          }

          return <Badge tone={statusTone[row.original.status]}>{row.original.status}</Badge>;
        }
      },
      {
        header: "Dispatcher",
        accessorKey: "dispatcher",
        size: 132
      },
      {
        header: "AI",
        accessorKey: "aiScore",
        size: 72,
        cell: ({ row }) => (
          <span className={cn("font-mono font-bold", row.original.aiScore > 88 ? "text-violet-200" : "text-slate-300")}>
            {row.original.aiScore}
          </span>
        )
      },
      {
        id: "decisionActions",
        header: "Decision",
        size: 150,
        cell: ({ row }) => {
          const load = row.original;
          const decision = loadDecisions[load.id];

          if (decision?.status === "accepted") {
            return (
              <div className="flex items-center gap-2">
                <Badge tone="green">Live Loads</Badge>
                <button type="button" title="Reopen load decision" onClick={(event) => { event.stopPropagation(); reopenLoad(load.id); }} className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.035] text-slate-300 hover:border-cyan-300/25 hover:text-cyan-100">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }

          if (decision?.status === "rejected") {
            return (
              <div className="flex items-center gap-2">
                <Badge tone="red">rejected</Badge>
                <button type="button" title="Reopen load decision" onClick={(event) => { event.stopPropagation(); reopenLoad(load.id); }} className="grid h-7 w-7 place-items-center border border-white/[0.08] bg-white/[0.035] text-slate-300 hover:border-cyan-300/25 hover:text-cyan-100">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-2">
              <button type="button" title="Accept load" onClick={(event) => { event.stopPropagation(); acceptLoad(load); }} className="grid h-7 w-7 place-items-center border border-emerald-300/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Reject load" onClick={(event) => { event.stopPropagation(); setRejectTarget(load); }} className="grid h-7 w-7 place-items-center border border-red-300/25 bg-red-400/10 text-red-200 hover:bg-red-400/20">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }
      }
    ],
    [acceptLoad, loadDecisions, reopenLoad, rejectLoad]
  );

  // TanStack Table controls row/cell models and column sizing.
  const table = useReactTable({
    data: loads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange"
  });

  // These rows are the table's computed row model.
  const rows = table.getRowModel().rows;

  // React Virtual renders only the visible rows plus a small overscan buffer.
  // This is critical for realtime tables with hundreds or thousands of rows.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 18
  });

  return (
    <section className="min-h-0 overflow-hidden border border-white/[0.08] bg-terminal-950/80 shadow-2xl shadow-black/30">
      <div className="flex h-11 items-center justify-between border-b border-white/[0.08] bg-terminal-900/90 px-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-100">Dispatch Workspace</h1>
          <p className="text-[11px] text-slate-500">Realtime load flow, broker intelligence, and lane execution</p>
        </div>
        <div className="hidden gap-2 text-[11px] text-slate-400 lg:flex">
          <span>Virtualized</span>
          <span className="text-slate-600">/</span>
          <span>Resizable columns</span>
          <span className="text-slate-600">/</span>
          <span>WebSocket patches</span>
        </div>
      </div>

      <div ref={parentRef} className="h-[calc(100%-2.75rem)] overflow-auto">
        <div style={{ width: table.getTotalSize(), minWidth: "100%", height: `${virtualizer.getTotalSize() + 38}px` }} className="relative">
          <div className="sticky top-0 z-10 flex h-[38px] border-b border-white/[0.08] bg-terminal-900 text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {table.getHeaderGroups()[0].headers.map((header) => (
              <div
                key={header.id}
                className="relative flex shrink-0 items-center border-r border-white/[0.06] px-3"
                style={{ width: header.getSize() }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
                <GripVertical className="ml-auto h-3 w-3 text-slate-700" />
              </div>
            ))}
          </div>

          <div className="absolute left-0 top-[38px] w-full">
            {virtualizer.getVirtualItems().map((virtualRow) => {
              // Each virtual row points to an actual TanStack row.
              const row = rows[virtualRow.index];
              const load = row.original;
              const selected = selectedLoadId === load.id;
              // changedLoadId triggers the row pulse animation after stream patches.
              const changed = changedLoadId === load.id;

              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectLoad(load)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectLoad(load);
                    }
                  }}
                  className={cn(
                    "absolute left-0 flex h-[38px] w-full items-center border-b border-white/[0.045] text-left text-xs text-slate-300 transition hover:bg-cyan-300/[0.055] hover:shadow-cyan",
                    selected && "bg-violet-400/[0.10] outline outline-1 outline-violet-300/25",
                    changed && "animate-row-pulse"
                  )}
                  // Virtual rows are absolutely positioned for smooth scrolling.
                  style={{ transform: `translateY(${virtualRow.start}px)`, width: table.getTotalSize() }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="flex h-full shrink-0 items-center overflow-hidden border-r border-white/[0.035] px-3"
                      style={{ width: cell.column.getSize() }}
                    >
                      <div className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {rejectTarget ? (
        <RejectLoadModal
          load={rejectTarget}
          reason={rejectReason}
          note={rejectNote}
          onReasonChange={setRejectReason}
          onNoteChange={setRejectNote}
          onClose={() => setRejectTarget(null)}
          onSave={() => {
            rejectLoad(rejectTarget, rejectReason, rejectNote);
            setRejectTarget(null);
            setRejectReason("Rate too low");
            setRejectNote("");
          }}
        />
      ) : null}
    </section>
  );
}

// Small helper for monospace numeric values.
function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono tabular-nums text-slate-300">{children}</span>;
}

// Pickup cell highlights hot loads with a flame icon.
function LocationCell({ value, hot }: { value: string; hot: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-slate-100">
      {hot ? <Flame className="h-3.5 w-3.5 shrink-0 text-red-300" /> : null}
      <span className="truncate">{value}</span>
    </span>
  );
}

function RejectLoadModal({
  load,
  reason,
  note,
  onReasonChange,
  onNoteChange,
  onClose,
  onSave
}: {
  load: FreightLoad;
  reason: string;
  note: string;
  onReasonChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const reasons = ["Rate too low", "Broker no answer", "Bad lane", "Equipment mismatch", "High deadhead", "Overweight", "Duplicate", "Other"];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 px-4">
      <section className="w-full max-w-[540px] border border-white/[0.12] bg-terminal-950 p-4 shadow-2xl shadow-black/70">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Reject Load</h2>
            <p className="mt-1 text-sm text-slate-500">{load.id} / {load.pickup} {"->"} {load.delivery}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center border border-white/[0.08] bg-white/[0.035] text-slate-300 hover:text-cyan-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-xs text-slate-500">
          Reason
          <select value={reason} onChange={(event) => onReasonChange(event.target.value)} className="mt-1 h-9 w-full border border-white/[0.08] bg-[#050b1a] px-3 text-sm text-slate-200 outline-none focus:border-cyan-300/35">
            {reasons.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-xs text-slate-500">
          Note
          <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={4} className="mt-1 w-full resize-none border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-300/35" placeholder="Optional dispatcher note..." />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 border border-white/[0.08] bg-white/[0.035] px-4 text-sm text-slate-300">Cancel</button>
          <button type="button" onClick={onSave} className="h-9 border border-red-300/25 bg-red-400/10 px-4 text-sm text-red-100">Reject Load</button>
        </div>
      </section>
    </div>
  );
}
