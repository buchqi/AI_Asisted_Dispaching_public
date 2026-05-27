import { FreightLoad } from "@/entities/load/types";
import { createIncomingMockLoad, patchRandomLoad } from "@/entities/load/mock-loads";

// StreamStatus mirrors the lifecycle states a real WebSocket client needs.
// UI components use this to show live/reconnecting/offline indicators.
export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline";

// LoadStreamEvent is the event contract between realtime transport and UI.
// Later this can be backed by a real WebSocket without changing the workspace UI.
export type LoadStreamEvent =
  | { type: "status"; status: StreamStatus }
  | { type: "new-load"; load: FreightLoad }
  | { type: "patch"; loads: FreightLoad[]; changedId: string }
  | { type: "notification"; title: string; priority: "new-load" | "load-update"; load: FreightLoad };

// MockRealtimeLoadClient simulates a backend WebSocket stream.
// It does not scrape, persist, or call any backend; it only patches local mock data.
export class MockRealtimeLoadClient {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private patchIntervalId: ReturnType<typeof setInterval> | null = null;
  private loads: FreightLoad[];
  private sequence = 1;

  // The client receives initial data so it can emit future patch updates.
  constructor(initialLoads: FreightLoad[]) {
    this.loads = initialLoads;
  }

  // connect starts the fake stream and returns a cleanup function.
  // This matches the shape we would use for a real WebSocket subscription.
  connect(emit: (event: LoadStreamEvent) => void) {
    emit({ type: "status", status: "connecting" });

    // Small delay makes the connection status feel realistic in the UI.
    const connectTimer = setTimeout(() => {
      emit({ type: "status", status: "live" });

      // Every interval emits a brand-new incoming load.
      // This mirrors a backend WebSocket event for a newly posted load.
      this.intervalId = setInterval(() => {
        const incomingLoad = createIncomingMockLoad(this.sequence);
        this.sequence += 1;
        this.loads = [incomingLoad, ...this.loads].slice(0, 300);

        emit({ type: "new-load", load: incomingLoad });
        emit({
          type: "notification",
          title: `New load posted: ${incomingLoad.pickup} -> ${incomingLoad.delivery} / ${incomingLoad.equipment} / ${incomingLoad.rpm.toFixed(2)} RPM`,
          priority: "new-load",
          load: incomingLoad
        });
      }, 60_000);

      // Patch updates are separate from new-load events.
      // They keep the table feeling live without pretending every update is a new load.
      this.patchIntervalId = setInterval(() => {
        const previous = this.loads;
        this.loads = patchRandomLoad(this.loads);
        const changed = this.loads.find((load, index) => load.updatedAt !== previous[index]?.updatedAt);

        if (changed) {
          emit({ type: "patch", loads: this.loads, changedId: changed.id });
        }
      }, 14_000);
    }, 500);

    // Cleanup prevents memory leaks when the component unmounts or reconnects.
    return () => {
      clearTimeout(connectTimer);
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }
      if (this.patchIntervalId) {
        clearInterval(this.patchIntervalId);
      }
      emit({ type: "status", status: "offline" });
    };
  }
}
