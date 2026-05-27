"use client";

import { Bell, CheckCircle2, Truck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { useWorkspaceStore } from "@/store/workspace-store";

// Centered detail modal for a selected load notification.
// Opening this modal marks the notification as read in the global store.
export function NotificationDetailModal() {
  const selectedNotificationId = useWorkspaceStore((state) => state.selectedNotificationId);
  const notifications = useWorkspaceStore((state) => state.notifications);
  const closeNotificationDetail = useWorkspaceStore((state) => state.closeNotificationDetail);
  const focusLoad = useWorkspaceStore((state) => state.focusLoad);
  const claimLoad = useWorkspaceStore((state) => state.claimLoad);
  const notification = notifications.find((item) => item.id === selectedNotificationId);

  if (!notification) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-4">
      <section className="w-full max-w-[560px] border border-white/[0.12] bg-terminal-950 p-4 shadow-2xl shadow-black/70">
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="green">new load</Badge>
              <Badge tone="cyan">read</Badge>
            </div>
            <h2 className="text-lg font-semibold text-slate-50">{notification.title}</h2>
            <p className="mt-1 text-sm text-slate-500">Live Loads notification detail</p>
          </div>
          <IconButton label="Close notification" className="h-9 w-9" onClick={closeNotificationDetail}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="grid gap-3 py-4 text-sm text-slate-300">
          {notification.load ? (
            <div className="border border-emerald-300/30 bg-emerald-300/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-emerald-300">Broker phone</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-bold text-emerald-100">{notification.load.phone}</span>
                <Badge tone="green">{notification.load.broker}</Badge>
              </div>
            </div>
          ) : null}
          <InfoRow label="Message" value={notification.body} />
          {notification.load ? (
            <>
              <InfoRow label="Lane" value={`${notification.load.pickup} -> ${notification.load.delivery}`} />
              <InfoRow label="Rate / RPM" value={`${notification.load.rate} USD / ${notification.load.rpm.toFixed(2)} RPM`} />
              <InfoRow label="Equipment" value={notification.load.equipment} />
            </>
          ) : null}
          <InfoRow label="Source" value="Live Loads" />
          <InfoRow label="Received" value={new Date(notification.createdAt).toLocaleTimeString()} />
          <InfoRow label="Status" value="Read after opening" />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              if (notification.load) {
                focusLoad(notification.load.id);
              } else {
                closeNotificationDetail();
              }
            }}
            className="flex h-10 items-center justify-center gap-2 border border-cyan-300/25 bg-cyan-300/10 text-sm text-cyan-100"
          >
            <Truck className="h-4 w-4" />
            Open Load Page
          </button>
          <button
            type="button"
            onClick={() => {
              if (notification.load) {
                claimLoad(notification.load.id);
                focusLoad(notification.load.id);
              }
            }}
            className="flex h-10 items-center justify-center gap-2 border border-emerald-300/25 bg-emerald-300/10 text-sm text-emerald-100"
          >
            <CheckCircle2 className="h-4 w-4" />
            Open Load
          </button>
          <button
            type="button"
            onClick={closeNotificationDetail}
            className="flex h-10 items-center justify-center gap-2 border border-white/[0.08] bg-white/[0.035] text-sm text-slate-300"
          >
            <Bell className="h-4 w-4" />
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-1 text-slate-200">{value}</div>
    </div>
  );
}
