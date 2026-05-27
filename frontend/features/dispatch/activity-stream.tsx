import { Activity, AlertTriangle, CircleDot, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Activity items are lightweight notifications shown in the right stream.
// They are separate from toast popups so the operator has a persistent audit trail.
export type ActivityItem = {
  id: string;
  text: string;
  at: string;
  tone: "green" | "cyan" | "violet" | "amber" | "red";
};

// ActivityStream displays realtime events such as hot loads, worker events,
// broker updates, and connection issues.
export function ActivityStream({ items }: { items: ActivityItem[] }) {
  return (
    <aside className="hidden min-h-0 border border-white/[0.08] bg-terminal-900/80 2xl:block">
      <div className="flex h-11 items-center justify-between border-b border-white/[0.08] px-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-200" />
          <h2 className="text-sm font-semibold">Activity Stream</h2>
        </div>
        <Badge tone="green">live</Badge>
      </div>
      <div className="space-y-2 p-3">
        {items.map((item) => (
          <div key={item.id} className="border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <StreamIcon tone={item.tone} />
              <span className="font-mono text-[11px] text-slate-500">{item.at}</span>
            </div>
            <p className="text-sm leading-5 text-slate-300">{item.text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

// Chooses an icon/color based on event priority.
function StreamIcon({ tone }: { tone: ActivityItem["tone"] }) {
  const className =
    tone === "red"
      ? "text-red-300"
      : tone === "green"
        ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "violet"
          ? "text-violet-200"
          : "text-cyan-200";
  const Icon = tone === "red" || tone === "amber" ? AlertTriangle : tone === "violet" ? RadioTower : CircleDot;
  return <Icon className={`h-4 w-4 ${className}`} />;
}
