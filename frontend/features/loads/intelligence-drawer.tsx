"use client";

import { motion } from "framer-motion";
import { X, BrainCircuit, Phone, TrendingUp, History, NotebookPen, ShieldCheck, type LucideIcon } from "lucide-react";
import { FreightLoad } from "@/types/load";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { formatCurrency } from "@/components/ui/utils";
import { useWorkspaceStore } from "@/store/workspace-store";

// IntelligenceDrawer opens when a table row is selected.
// It keeps the dispatcher in context instead of navigating to a separate page.
export function IntelligenceDrawer({ load }: { load: FreightLoad }) {
  const closeDrawer = useWorkspaceStore((state) => state.closeDrawer);

  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="fixed right-0 top-16 z-30 h-[calc(100vh-4rem)] w-full max-w-[420px] border-l border-white/10 bg-terminal-950/95 shadow-2xl shadow-black/50 backdrop-blur"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between border-b border-white/[0.08] p-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone={load.hot ? "red" : "cyan"}>{load.hot ? "hot load" : "active load"}</Badge>
              <Badge tone="violet">AI {load.aiScore}</Badge>
            </div>
            <h2 className="truncate text-lg font-semibold text-slate-50">
              {load.pickup}
              {" -> "}
              {load.delivery}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{load.id} / {load.equipment} / {load.source}</p>
          </div>
          <IconButton label="Close drawer" onClick={closeDrawer} className="h-9 w-9">
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <section className="grid grid-cols-3 gap-2">
            <Metric label="Rate" value={formatCurrency(load.rate)} />
            <Metric label="RPM" value={`$${load.rpm.toFixed(2)}`} />
            <Metric label="Miles" value={String(load.miles)} />
          </section>

          <DrawerBlock icon={ShieldCheck} title="Broker Profile">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Broker</span><span>{load.broker || "Not connected"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Score</span><span>Not connected</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Days to pay</span><span>Not connected</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Company</span><span>{load.company || "Not connected"}</span></div>
            </div>
          </DrawerBlock>

          <DrawerBlock icon={Phone} title="Contact">
            <div className="space-y-2 font-mono text-sm text-cyan-200">
              <div>{load.phone || "Not connected"}</div>
              <div>Not connected</div>
            </div>
          </DrawerBlock>

          <DrawerBlock icon={BrainCircuit} title="AI Insights">
            <p className="text-sm text-slate-500">TODO: connect FastAPI intelligence endpoint.</p>
          </DrawerBlock>

          <DrawerBlock icon={TrendingUp} title="Lane History">
            <p className="text-sm text-slate-500">No lane history loaded.</p>
          </DrawerBlock>

          <DrawerBlock icon={History} title="Previous Interactions">
            <Timeline items={[]} />
          </DrawerBlock>

          <DrawerBlock icon={NotebookPen} title="Notes">
            <Timeline items={[]} />
          </DrawerBlock>
        </div>
      </div>
    </motion.aside>
  );
}

// Compact KPI block used at the top of the drawer.
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

// Reusable section wrapper for drawer intelligence modules.
function DrawerBlock({
  icon: Icon,
  title,
  children
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-white/[0.08] bg-white/[0.028] p-3">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-4 w-4 text-violet-200" />
        {title}
      </div>
      {children}
    </section>
  );
}

// Simple vertical list for notes and broker interaction history.
function Timeline({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="border-l border-cyan-300/30 pl-3 text-sm text-slate-300">
          {item}
        </div>
      ))}
    </div>
  );
}
