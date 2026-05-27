"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { useWorkspaceStore } from "@/store/workspace-store";

// ToastViewport renders global action feedback.
// This keeps transient UI feedback from lingering on screen.
export function ToastViewport() {
  const toasts = useWorkspaceStore((state) => state.toasts);
  const dismissToast = useWorkspaceStore((state) => state.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const id = window.setInterval(() => {
      const now = Date.now();
      toasts.forEach((toast) => {
        if (now - toast.createdAt > 5500) {
          dismissToast(toast.id);
        }
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [dismissToast, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto border border-white/[0.16] bg-[#020617] p-3 shadow-2xl shadow-black/80">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge tone={toast.tone}>{toast.title}</Badge>
            <IconButton label="Dismiss toast" className="h-7 w-7" onClick={() => dismissToast(toast.id)}>
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>
          <p className="text-sm leading-5 text-slate-300">{toast.body}</p>
        </div>
      ))}
    </div>
  );
}
