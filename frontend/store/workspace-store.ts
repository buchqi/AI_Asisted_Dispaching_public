import { create } from "zustand";
import { FreightLoad, LoadDecision } from "@/entities/load/types";
import { readStoredJson, writeStoredJson } from "@/services/storage/persistence";

export type WorkspacePage =
  | "dispatch"
  | "live-loads"
  | "assignments"
  | "search-sessions"
  | "brokers"
  | "companies"
  | "trucks"
  | "drivers"
  | "analytics"
  | "notifications"
  | "settings";

export type WorkspaceModal = "quick-action" | "command-menu" | "notifications" | "profile" | null;

export type ToastMessage = {
  id: string;
  title: string;
  body: string;
  tone: "green" | "cyan" | "amber" | "red" | "violet";
  createdAt: number;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  priority: "new-load";
  source: "live-loads";
  load?: FreightLoad;
  read: boolean;
  createdAt: number;
};

const loadDecisionsStorageKey = "freight-command-load-decisions";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Zustand stores UI/app state that does not belong to the backend.
// Examples: selected row, open drawer, active local tab, fullscreen table mode.
type WorkspaceState = {
  activePage: WorkspacePage;
  selectedLoadId: string | null;
  drawerOpen: boolean;
  activeSearch: string;
  fullscreenTable: boolean;
  globalSearch: string;
  laneFilter: string;
  equipmentFilter: string;
  minRpm: number;
  maxDeadhead: number;
  minBrokerScore: number;
  maxWeight: number;
  activeLoadDate: string;
  decisionFilter: "All" | "new" | "accepted" | "rejected";
  modal: WorkspaceModal;
  toasts: ToastMessage[];
  notifications: AppNotification[];
  selectedNotificationId: string | null;
  focusedLoadId: string | null;
  claimedLoadIds: string[];
  watchedLoadIds: string[];
  hiddenLoadIds: string[];
  calledLoadIds: string[];
  loadDecisions: Record<string, LoadDecision>;
  setActivePage: (page: WorkspacePage) => void;
  selectLoad: (load: FreightLoad) => void;
  closeDrawer: () => void;
  setActiveSearch: (search: string) => void;
  toggleFullscreenTable: () => void;
  setGlobalSearch: (value: string) => void;
  setLaneFilter: (value: string) => void;
  setEquipmentFilter: (value: string) => void;
  setMinRpm: (value: number) => void;
  setMaxDeadhead: (value: number) => void;
  setMinBrokerScore: (value: number) => void;
  setMaxWeight: (value: number) => void;
  setActiveLoadDate: (value: string) => void;
  setDecisionFilter: (value: "All" | "new" | "accepted" | "rejected") => void;
  saveFilterPreset: () => void;
  resetFilters: () => void;
  openModal: (modal: WorkspaceModal) => void;
  closeModal: () => void;
  pushToast: (message: Omit<ToastMessage, "id" | "createdAt">) => void;
  dismissToast: (id: string) => void;
  pushNotification: (notification: Omit<AppNotification, "id" | "read" | "createdAt">) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearReadNotifications: () => void;
  openNotificationDetail: (id: string) => void;
  closeNotificationDetail: () => void;
  focusLoad: (loadId: string) => void;
  clearFocusedLoad: () => void;
  claimLoad: (loadId: string) => void;
  watchLoad: (loadId: string) => void;
  hideLoad: (loadId: string) => void;
  restoreHiddenLoads: () => void;
  markLoadCalled: (loadId: string) => void;
  acceptLoad: (load: FreightLoad) => void;
  rejectLoad: (load: FreightLoad, reason?: string, note?: string) => void;
  reopenLoad: (loadId: string) => void;
};

// This store is intentionally small and focused.
// Server data should later go through TanStack Query or WebSocket sync,
// while quick UI state stays here.
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  // Default screen is the realtime dispatch workspace.
  activePage: "dispatch",
  // No load is selected when the workspace first opens.
  selectedLoadId: null,
  // Drawer stays closed until an operator clicks a table row.
  drawerOpen: false,
  // Default search session shown in the tab strip.
  activeSearch: "Southeast Hot Lanes",
  // Reserved for future multi-monitor/fullscreen table controls.
  fullscreenTable: false,
  // Global search filters the mock table and is ready to become API query state.
  globalSearch: "",
  laneFilter: "All",
  equipmentFilter: "All",
  // Initial operational filters match the visible filter chips.
  minRpm: 2.35,
  maxDeadhead: 100,
  minBrokerScore: 0,
  maxWeight: 42000,
  activeLoadDate: todayKey(),
  decisionFilter: "All",
  // Global modal state powers topbar windows.
  modal: null,
  // Toasts give immediate feedback when a user presses action buttons.
  toasts: [],
  // Global inbox receives events no matter which page is currently open.
  notifications: [],
  // Selected notification opens in a centered detail modal.
  selectedNotificationId: null,
  // Load that should be focused after notification navigation.
  focusedLoadId: null,
  // Frontend-only workflow state for load actions.
  claimedLoadIds: readStoredJson<string[]>("freight-command-claimed-loads", []),
  watchedLoadIds: readStoredJson<string[]>("freight-command-watched-loads", []),
  hiddenLoadIds: readStoredJson<string[]>("freight-command-hidden-loads", []),
  calledLoadIds: readStoredJson<string[]>("freight-command-called-loads", []),
  loadDecisions: readStoredJson<Record<string, LoadDecision>>(loadDecisionsStorageKey, {}),
  // Changes the current workspace screen.
  setActivePage: (page) => set({ activePage: page, drawerOpen: false, selectedLoadId: null, modal: null }),
  // Selecting a load also opens the intelligence drawer.
  selectLoad: (load) => set({ selectedLoadId: load.id, drawerOpen: true }),
  // Closing drawer clears the selected load so the drawer actually disappears.
  closeDrawer: () => set({ drawerOpen: false, selectedLoadId: null }),
  // Switches the active live search session tab.
  setActiveSearch: (search) => set({ activeSearch: search }),
  // Prepared for a future button/shortcut that maximizes the load table.
  toggleFullscreenTable: () => set((state) => ({ fullscreenTable: !state.fullscreenTable })),
  // Updates the topbar/table search text.
  setGlobalSearch: (value) => set({ globalSearch: value }),
  // Updates lane preset filter.
  setLaneFilter: (value) => set({ laneFilter: value }),
  // Updates equipment filter.
  setEquipmentFilter: (value) => set({ equipmentFilter: value }),
  // Updates minimum RPM filter.
  setMinRpm: (value) => set({ minRpm: value }),
  // Updates maximum deadhead filter.
  setMaxDeadhead: (value) => set({ maxDeadhead: value }),
  // Updates minimum broker score filter.
  setMinBrokerScore: (value) => set({ minBrokerScore: value }),
  // Updates maximum load weight filter.
  setMaxWeight: (value) => set({ maxWeight: value }),
  // Changes the active archive day shown in Dispatch Workspace.
  setActiveLoadDate: (value) => set({ activeLoadDate: value }),
  // Filters Dispatch Workspace by dispatcher decision status.
  setDecisionFilter: (value) => set({ decisionFilter: value }),
  // Saves current dispatch filters as a frontend preset.
  saveFilterPreset: () =>
    set((state) => {
      writeStoredJson("freight-command-layout", {
        laneFilter: state.laneFilter,
        equipmentFilter: state.equipmentFilter,
        minRpm: state.minRpm,
        maxDeadhead: state.maxDeadhead,
        minBrokerScore: state.minBrokerScore,
        maxWeight: state.maxWeight,
        activeLoadDate: state.activeLoadDate,
        decisionFilter: state.decisionFilter,
        savedAt: new Date().toISOString()
      });
      return {};
    }),
  // Restores default operational filters.
  resetFilters: () => set({ globalSearch: "", laneFilter: "All", equipmentFilter: "All", minRpm: 2.35, maxDeadhead: 100, minBrokerScore: 0, maxWeight: 42000, activeLoadDate: todayKey(), decisionFilter: "All" }),
  // Opens one global modal/panel at a time.
  openModal: (modal) => set((state) => ({ modal: state.modal === modal ? null : modal })),
  // Closes the current global modal/panel.
  closeModal: () => set({ modal: null }),
  // User navigation/actions should not create toast notifications.
  // New-load alerts still appear through pushNotification below.
  pushToast: () => set({}),
  // Removes a toast.
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  // Adds a global new-load notification and mirrors it into toast feedback.
  pushNotification: (notification) =>
    set((state) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
      const createdAt = Date.now();
      const appNotification: AppNotification = {
        id,
        createdAt,
        read: false,
        ...notification
      };
      const toastTone: ToastMessage["tone"] = "green";

      return {
        notifications: [appNotification, ...state.notifications].slice(0, 50),
        toasts: [
          {
            id: `${id}-toast`,
            createdAt,
            title: notification.title,
            body: notification.body,
            tone: toastTone
          },
          ...state.toasts
        ].slice(0, 3)
      };
    }),
  // Marks one notification as read.
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    })),
  // Marks every global notification as read.
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true }))
    })),
  // Clears read notifications and keeps unread work visible.
  clearReadNotifications: () =>
    set((state) => ({
      notifications: state.notifications.filter((notification) => !notification.read)
    })),
  // Opens notification details and marks it as read.
  openNotificationDetail: (id) =>
    set((state) => ({
      selectedNotificationId: id,
      modal: null,
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    })),
  // Closes the centered notification detail modal.
  closeNotificationDetail: () => set({ selectedNotificationId: null }),
  // Focuses a specific load from notification or page workflow.
  focusLoad: (loadId) => set({ focusedLoadId: loadId, activePage: "live-loads", selectedNotificationId: null, modal: null }),
  // Clears one-time load focus after the page has consumed it.
  clearFocusedLoad: () => set({ focusedLoadId: null }),
  // Marks a load as claimed and stores it locally.
  claimLoad: (loadId) =>
    set((state) => {
      const claimedLoadIds = Array.from(new Set([loadId, ...state.claimedLoadIds]));
      writeStoredJson("freight-command-claimed-loads", claimedLoadIds);
      return { claimedLoadIds };
    }),
  // Toggles a load watch state and stores it locally.
  watchLoad: (loadId) =>
    set((state) => {
      const exists = state.watchedLoadIds.includes(loadId);
      const watchedLoadIds = exists ? state.watchedLoadIds.filter((id) => id !== loadId) : [loadId, ...state.watchedLoadIds];
      writeStoredJson("freight-command-watched-loads", watchedLoadIds);
      return { watchedLoadIds };
    }),
  // Hides a load from Live Loads and stores it locally.
  hideLoad: (loadId) =>
    set((state) => {
      const hiddenLoadIds = Array.from(new Set([loadId, ...state.hiddenLoadIds]));
      writeStoredJson("freight-command-hidden-loads", hiddenLoadIds);
      return { hiddenLoadIds };
    }),
  // Restores hidden loads in the frontend workflow.
  restoreHiddenLoads: () =>
    set(() => {
      writeStoredJson("freight-command-hidden-loads", []);
      return { hiddenLoadIds: [] };
    }),
  // Marks broker contact as called and stores it locally.
  markLoadCalled: (loadId) =>
    set((state) => {
      const calledLoadIds = Array.from(new Set([loadId, ...state.calledLoadIds]));
      writeStoredJson("freight-command-called-loads", calledLoadIds);
      return { calledLoadIds };
    }),
  // Accepting a load moves it into the Live Loads workflow.
  acceptLoad: (load) =>
    set((state) => {
      const loadDecisions: Record<string, LoadDecision> = {
        ...state.loadDecisions,
        [load.id]: {
          loadId: load.id,
          status: "accepted",
          decidedAt: Date.now(),
          load
        }
      };
      writeStoredJson(loadDecisionsStorageKey, loadDecisions);
      return { loadDecisions };
    }),
  // Rejected loads remain visible in Dispatch Workspace with a clear status.
  rejectLoad: (load, reason, note) =>
    set((state) => {
      const loadDecisions: Record<string, LoadDecision> = {
        ...state.loadDecisions,
        [load.id]: {
          loadId: load.id,
          status: "rejected",
          reason,
          note,
          decidedAt: Date.now(),
          load
        }
      };
      writeStoredJson(loadDecisionsStorageKey, loadDecisions);
      return { loadDecisions };
    }),
  // Reopen removes the decision so the dispatcher can decide again.
  reopenLoad: (loadId) =>
    set((state) => {
      const loadDecisions = { ...state.loadDecisions };
      delete loadDecisions[loadId];
      writeStoredJson(loadDecisionsStorageKey, loadDecisions);
      return { loadDecisions };
    })
}));
