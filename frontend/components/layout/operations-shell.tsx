import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastViewport } from "@/components/layout/toast-viewport";
import { NotificationDetailModal } from "@/components/layout/notification-detail-modal";

// OperationsShell is the persistent app chrome.
// Every operational screen should live inside this layout so navigation,
// global search, status indicators, and workstation spacing stay consistent.
export function OperationsShell({ children }: { children: React.ReactNode }) {
  return (
    // The background is dark-mode first and tuned for long dispatcher sessions.
    // The subtle cyan glow gives the UI depth without making it decorative.
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_28%),linear-gradient(135deg,#050B1A_0%,#071226_45%,#0A1020_100%)] text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          {children}
        </div>
      </div>
      <ToastViewport />
      <NotificationDetailModal />
    </main>
  );
}
