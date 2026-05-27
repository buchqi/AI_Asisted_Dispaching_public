"use client";

import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  ClipboardCheck,
  RadioTower,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  UserRoundCheck,
  type LucideIcon
} from "lucide-react";
import { useWorkspaceStore, type WorkspacePage } from "@/store/workspace-store";
import { cn } from "@/shared/lib/utils";

// Navigation items for the left rail.
// The labels are used for tooltips and accessibility.
const navItems: Array<{ label: string; page: WorkspacePage; icon: LucideIcon }> = [
  { label: "Dispatch Workspace", page: "dispatch", icon: RadioTower },
  { label: "Live Loads", page: "live-loads", icon: Route },
  { label: "Assignments", page: "assignments", icon: ClipboardCheck },
  { label: "Search Center", page: "search-sessions", icon: Search },
  { label: "Brokers", page: "brokers", icon: ShieldCheck },
  { label: "Companies", page: "companies", icon: Building2 },
  { label: "Trucks", page: "trucks", icon: Truck },
  { label: "Drivers", page: "drivers", icon: UserRoundCheck },
  { label: "Analytics", page: "analytics", icon: ChartNoAxesCombined },
  { label: "Notifications", page: "notifications", icon: Bell },
  { label: "Settings", page: "settings", icon: Settings }
];

// The sidebar is intentionally icon-first and narrow.
// Dispatchers often use large tables, so horizontal space is valuable.
export function Sidebar() {
  const activePage = useWorkspaceStore((state) => state.activePage);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);

  return (
    <aside className="group/sidebar hidden w-[76px] shrink-0 overflow-hidden border-r border-white/[0.08] bg-terminal-950/90 px-3 py-4 backdrop-blur transition-[width] duration-200 hover:w-[238px] md:block">
      <div className="mb-5 flex h-11 items-center gap-3 rounded-md border border-violet-300/30 bg-violet-400/15 px-3 text-violet-100 shadow-glow">
        <span className="grid h-6 w-6 shrink-0 place-items-center text-sm font-black">FC</span>
        <span className="whitespace-nowrap text-sm font-semibold opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100">
          Freight Command
        </span>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => setActivePage(item.page)}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-md border px-2.5 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100",
                activePage === item.page
                  ? "border-violet-300/30 bg-violet-400/15 text-violet-100 shadow-glow"
                  : "border-white/5 bg-white/[0.03] text-slate-400"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-150 group-hover/sidebar:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
