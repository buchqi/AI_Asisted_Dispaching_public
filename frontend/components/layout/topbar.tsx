"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock3, Command, LockKeyhole, Navigation, Play, Plus, Radio, Route, Search, Settings, Truck, UserRound, X, Zap, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { useAuthStore } from "@/store/auth-store";
import { useCompanyStore } from "@/store/company-store";
import { useWorkspaceStore, type WorkspacePage } from "@/store/workspace-store";
import {
  type CommandResult,
  type DriverUnitSummary,
  type LoadAssignmentSummary,
  type TruckUnitSummary
} from "@/types/workspace";

// Topbar holds global search, realtime status, counters, notifications, and profile.
// It should remain stable while the user switches between operational screens.
export function Topbar() {
  const router = useRouter();
  const [now, setNow] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const globalSearch = useWorkspaceStore((state) => state.globalSearch);
  const setGlobalSearch = useWorkspaceStore((state) => state.setGlobalSearch);
  const modal = useWorkspaceStore((state) => state.modal);
  const openModal = useWorkspaceStore((state) => state.openModal);
  const closeModal = useWorkspaceStore((state) => state.closeModal);
  const pushToast = useWorkspaceStore((state) => state.pushToast);
  const setActivePage = useWorkspaceStore((state) => state.setActivePage);
  const notifications = useWorkspaceStore((state) => state.notifications);
  const openNotificationDetail = useWorkspaceStore((state) => state.openNotificationDetail);
  const markAllNotificationsRead = useWorkspaceStore((state) => state.markAllNotificationsRead);
  const focusLoad = useWorkspaceStore((state) => state.focusLoad);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const user = useAuthStore((state) => state.user);
  const logoutAuth = useAuthStore((state) => state.logout);
  const clearActiveCompany = useCompanyStore((state) => state.clearActiveCompany);
  const dispatcherName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Dispatcher";
  const [drivers] = useState<DriverUnitSummary[]>([]);
  const [trucks] = useState<TruckUnitSummary[]>([]);
  const [assignments] = useState<LoadAssignmentSummary[]>([]);
  const commandResults = useMemo(
    () => buildCommandResults(globalSearch, drivers, trucks, assignments),
    [assignments, drivers, globalSearch, trucks]
  );
  const activeTruckCount = trucks.filter((truck) => truck.status === "loaded" || assignments.some((assignment) => assignment.status === "assigned" && truck.driver === assignment.driverName)).length;
  const stoppedTruckCount = trucks.filter((truck) => truck.status === "service").length;

  const executeResult = (result: CommandResult) => {
    if (result.loadId) {
      focusLoad(result.loadId);
    } else {
      setActivePage(result.page);
    }
    setGlobalSearch(result.query);
    setSearchOpen(false);
    closeModal();
  };

  // Updates the live clock once per second.
  // This is client-side because server-rendered time would immediately become stale.
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const logout = () => {
    logoutAuth();
    clearActiveCompany();
    closeModal();
    router.replace("/login");
  };

  // Global panels close with Escape and outside click.
  // This prevents opened windows from getting stuck on screen.
  useEffect(() => {
    if (!modal) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("[data-panel-trigger='true']")) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(target)) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeModal, modal]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <header className="relative z-[90] flex h-16 items-center gap-3 border-b border-white/[0.08] bg-terminal-950/75 px-3 backdrop-blur xl:px-5">
      <div ref={searchRef} className="relative min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-slate-400 focus-within:border-cyan-300/35 focus-within:bg-cyan-300/[0.06]">
          <Search className="h-4 w-4 shrink-0" />
          <input
            ref={searchInputRef}
            value={globalSearch}
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setGlobalSearch(event.target.value);
              setSearchOpen(true);
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
            placeholder="Global search: loads, drivers, trailers, tracker status, brokers..."
          />
          <div className="hidden items-center gap-1 lg:flex">
            <Badge tone={activeTruckCount > 0 ? "cyan" : "slate"}>{activeTruckCount} in transit</Badge>
            <Badge tone={stoppedTruckCount > 0 ? "red" : "green"}>{stoppedTruckCount} stopped</Badge>
          </div>
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500 lg:inline-flex">
            Ctrl K
          </kbd>
        </div>
        {searchOpen ? (
          <div className="absolute left-0 top-12 z-[120] w-full overflow-hidden border border-white/[0.18] bg-[#020617] shadow-2xl shadow-black">
            <div className="grid grid-cols-3 gap-2 border-b border-white/[0.10] bg-[#020617] p-3 text-xs">
              <TrackerStat label="In Transit" value={activeTruckCount} tone="cyan" />
              <TrackerStat label="Stopped" value={stoppedTruckCount} tone={stoppedTruckCount > 0 ? "red" : "green"} />
              <TrackerStat label="Assigned Loads" value={assignments.filter((item) => item.status === "assigned").length} tone="amber" />
            </div>
            <div className="max-h-[420px] overflow-auto bg-[#020617] p-2">
              {commandResults.length > 0 ? commandResults.map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => executeResult(result)}
                    className="flex w-full items-start gap-3 border border-white/[0.08] bg-[#071226] p-3 text-left transition hover:border-cyan-300/30 hover:bg-[#0b1d33]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/[0.08] bg-white/[0.035] text-cyan-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-100">{result.title}</span>
                        <Badge tone={result.tone}>{result.meta}</Badge>
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">{result.body}</span>
                    </span>
                  </button>
                );
              }) : (
                <div className="p-5 text-sm text-slate-500">No results. FastAPI search is not connected yet.</div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <Badge tone="green" className="gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-live-dot" />
          WebSocket Live
        </Badge>
        <Badge tone="cyan" className="gap-1.5">
          <Zap className="h-3 w-3" />
          6 workers
        </Badge>
        <Badge tone="violet">12 searches</Badge>
        <Badge tone="amber">1,284 loads</Badge>
      </div>

      <div className="hidden items-center gap-2 text-xs text-slate-400 xl:flex">
        <Clock3 className="h-4 w-4 text-cyan-200" />
        <span className="font-mono tabular-nums">{now}</span>
      </div>

      <IconButton label="Quick action" data-panel-trigger="true" active={modal === "quick-action"} onClick={() => openModal("quick-action")}>
        <Plus className="h-4 w-4" />
      </IconButton>
      <IconButton label="Command menu" data-panel-trigger="true" active={modal === "command-menu"} onClick={() => openModal("command-menu")}>
        <Command className="h-4 w-4" />
      </IconButton>
      <div className="relative">
        <IconButton label="Notifications" data-panel-trigger="true" active={modal === "notifications"} onClick={() => openModal("notifications")}>
          <Bell className="h-4 w-4" />
        </IconButton>
        {unreadCount > 0 ? (
          <span className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-400 px-1 font-mono text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        data-panel-trigger="true"
        onClick={() => openModal("profile")}
        className={`grid h-10 w-10 place-items-center rounded-md border text-xs font-semibold transition ${
          modal === "profile"
            ? "border-violet-300/30 bg-violet-400/15 text-violet-100 shadow-glow"
            : "border-white/10 bg-cyan-300/10 text-cyan-100 hover:border-cyan-300/35 hover:bg-cyan-300/15"
        }`}
        title="Dispatcher profile"
      >
        GD
      </button>
      <Radio className="hidden h-4 w-4 text-emerald-300 sm:block" />

      {modal ? (
        <div ref={panelRef} className="fixed right-4 top-20 z-40 w-[360px] border border-white/[0.14] bg-[#020617] shadow-2xl shadow-black/70">
          <div className="flex h-11 items-center justify-between border-b border-white/[0.08] px-3">
            <div className="text-sm font-semibold text-slate-100">{modalTitles[modal]}</div>
            <IconButton label="Close panel" className="h-8 w-8" onClick={closeModal}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="space-y-2 p-3">
            {modal === "quick-action" ? (
              <>
                <PanelAction
                  icon={Play}
                  title="Start Live Search"
                  body="Ready for FastAPI search integration."
                  onClick={() => {
                    closeModal();
                  }}
                />
                <PanelAction
                  icon={Settings}
                  title="Open Workspace Settings"
                  body="Jumps to settings from the sidebar."
                  onClick={() => {
                    pushToast({ title: "Settings", body: "Use the sidebar Settings icon for the full settings window.", tone: "cyan" });
                    closeModal();
                  }}
                />
              </>
            ) : null}

            {modal === "command-menu" ? (
              <>
                {[
                  { label: "Open dispatch workspace", page: "dispatch" },
                  { label: "Open broker intelligence", page: "brokers" },
                  { label: "Open search center", page: "search-sessions" },
                  { label: "Open trucks board", page: "trucks" },
                  { label: "Open analytics", page: "analytics" }
                ].map((command) => (
                  <button
                    key={command.label}
                    type="button"
                    onClick={() => {
                      setActivePage(command.page as Parameters<typeof setActivePage>[0]);
                      pushToast({ title: command.label, body: "Command executed and page opened.", tone: "violet" });
                      closeModal();
                    }}
                    className="flex w-full items-center justify-between border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-left text-sm text-slate-300 transition hover:border-violet-300/30 hover:bg-violet-400/10"
                  >
                    {command.label}
                    <kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">Enter</kbd>
                  </button>
                ))}
              </>
            ) : null}

            {modal === "notifications" ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge tone={unreadCount > 0 ? "red" : "green"}>{unreadCount} unread</Badge>
                  <button type="button" onClick={markAllNotificationsRead} className="text-xs text-cyan-200 hover:text-cyan-100">
                    Mark all read
                  </button>
                </div>
                {notifications.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotificationDetail(item.id)}
                    className="block w-full border border-white/[0.10] bg-[#071226] p-3 text-left text-sm text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge tone="green">new load</Badge>
                      {!item.read ? <Badge tone="violet">new</Badge> : null}
                    </div>
                    <div className="font-semibold text-slate-100">{item.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{item.body}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setActivePage("notifications");
                    closeModal();
                  }}
                  className="h-9 w-full border border-violet-300/30 bg-violet-400/15 text-sm text-violet-100"
                >
                  Open notification center
                </button>
              </>
            ) : null}

            {modal === "profile" ? (
              <>
                <div className="flex items-center gap-3 border border-white/[0.08] bg-white/[0.035] p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-cyan-300/10 font-semibold text-cyan-100">GD</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{dispatcherName}</div>
                    <div className="text-xs text-slate-500">Operations / Live dispatch</div>
                  </div>
                </div>
                <PanelAction
                  icon={UserRound}
                  title="Switch status"
                  body="Ready for account status integration."
                  onClick={closeModal}
                />
                <PanelAction
                  icon={Settings}
                  title="Profile settings"
                  body="Ready for real account settings."
                  onClick={closeModal}
                />
                <PanelAction
                  icon={LockKeyhole}
                  title="Logout"
                  body="Ends the local dispatcher session."
                  onClick={logout}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

const modalTitles = {
  "quick-action": "Quick Actions",
  "command-menu": "Command Menu",
  notifications: "Notifications",
  profile: "Dispatcher Profile"
};

function PanelAction({
  icon: Icon,
  title,
  body,
  onClick
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 border border-white/[0.08] bg-white/[0.035] p-3 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/10"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
      <span>
        <span className="block text-sm font-semibold text-slate-100">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{body}</span>
      </span>
    </button>
  );
}

function TrackerStat({ label, value, tone }: { label: string; value: number; tone: CommandResult["tone"] }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.035] p-2">
      <Badge tone={tone}>{label}</Badge>
      <div className="mt-2 font-mono text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function buildCommandResults(query: string, drivers: DriverUnitSummary[], trucks: TruckUnitSummary[], assignments: LoadAssignmentSummary[]): CommandResult[] {
  return [];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
