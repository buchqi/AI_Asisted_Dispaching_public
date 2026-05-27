import { cn } from "@/shared/lib/utils";

// Small semantic color system for compact labels.
type BadgeTone = "green" | "red" | "amber" | "cyan" | "violet" | "slate";

// Centralized class map keeps every status badge visually consistent.
const toneMap: Record<BadgeTone, string> = {
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  red: "border-red-400/25 bg-red-400/10 text-red-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  slate: "border-slate-500/25 bg-slate-500/10 text-slate-300"
};

// Reusable badge component for statuses, filters, sources, and counters.
export function Badge({
  children,
  tone = "slate",
  className
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center whitespace-nowrap rounded border px-2 text-[11px] font-medium",
        toneMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
