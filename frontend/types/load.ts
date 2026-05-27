// LoadStatus describes the operational state of a load in the table.
// These values are frontend-friendly and can later map to backend enums.
export type LoadStatus = "new" | "watching" | "claimed" | "calling" | "stale";

// LoadDecisionStatus tracks the dispatcher's business decision.
// It is separate from LoadStatus because a load can be new/watching operationally
// while still being accepted or rejected by the dispatcher workflow.
export type LoadDecisionStatus = "accepted" | "rejected";

// LoadSource tells the dispatcher where a load came from.
// Real backend integrations can add more sources later.
export type LoadSource = "DAT" | "Truckstop" | "Direct" | "Email" | "Private";

// FreightLoad is the main table entity.
// Every row in the realtime load table is shaped like this.
export type FreightLoad = {
  id: string;
  ageMinutes: number;
  pickup: string;
  delivery: string;
  rpm: number;
  miles: number;
  deadhead: number;
  weight: number;
  equipment: "Dry Van" | "Reefer" | "Flatbed" | "Power Only" | "Step Deck";
  broker: string;
  company: string;
  phone: string;
  rate: number;
  postedTime: string;
  source: LoadSource;
  status: LoadStatus;
  dispatcher: string;
  aiScore: number;
  hot: boolean;
  receivedAt: number;
  updatedAt: number;
};

// LoadDecision stores the frontend workflow decision for a specific load.
// The embedded load snapshot lets Live Loads keep the accepted load even if the
// Dispatch Workspace stream later changes or filters the table.
export type LoadDecision = {
  loadId: string;
  status: LoadDecisionStatus;
  reason?: string;
  note?: string;
  decidedAt: number;
  load: FreightLoad;
};

// BrokerProfile powers the right-side intelligence drawer.
// This is separated from FreightLoad because broker intelligence can be fetched
// independently from the load stream in a real production app.
export type BrokerProfile = {
  broker: string;
  company: string;
  score: number;
  daysToPay: number;
  phone: string;
  email: string;
  laneHistory: string[];
  notes: string[];
  previousInteractions: string[];
};
