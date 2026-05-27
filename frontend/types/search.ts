import { WorkspacePage } from "@/store/workspace-store";

// SearchDomain names the backend resource family a result came from.
// Backend responses should use these values so the frontend can route results
// without guessing from title/body text.
export type SearchDomain = "load" | "driver" | "truck" | "broker" | "assignment" | "action";

// SearchResult is the single contract for Global Search and Search Center.
// Backend can later return this exact shape from GET /api/search.
export type SearchResult = {
  id: string;
  domain: SearchDomain;
  title: string;
  body: string;
  meta: string;
  tone: "green" | "cyan" | "amber" | "red" | "violet" | "slate";
  page: WorkspacePage;
  query: string;
  loadId?: string;
  driverId?: string;
  truckId?: string;
  brokerId?: string;
  assignmentId?: string;
};

// SearchRequest is intentionally close to what the backend endpoint should
// accept once the FastAPI search endpoint is connected.
export type SearchRequest = {
  query: string;
  category?: "All" | "Loads" | "Drivers" | "Trailers" | "Brokers" | "Assignments";
  limit?: number;
};

export type SearchOverrides = {
  min_rpm?: number;
  preferred_broker_sources?: string[];
};

export type StartSearchPayload = {
  company_id: number;
  truck_ids: number[];
  overrides?: SearchOverrides;
  timeout_seconds?: number;
};

export type SearchBatch = {
  id: number;
  company_id: number;
  created_by_user_id: number;
  status: string;
  filters_snapshot: Record<string, unknown> | null;
  total_trucks: number;
  completed_trucks: number;
  failed_trucks: number;
  timeout_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TruckSearchSession = {
  id: number;
  search_batch_id: number;
  company_id: number;
  truck_id: number;
  owner_user_id: number;
  status: string;
  filters_snapshot: Record<string, unknown> | null;
  timeout_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ScoreBreakdownItem = {
  points?: number;
  value?: unknown;
  reason?: string;
};

export type ScoreBreakdown = Record<string, ScoreBreakdownItem>;

export type LoadSnapshotSummary = {
  id: number;
  load_id: number;
  source: string | null;
  broker: string | null;
  origin: string | null;
  destination: string | null;
  pickup_date: string | null;
  delivery_date: string | null;
  posted_rate: number | null;
  miles: number | null;
  rpm: number | null;
  deadhead_miles: number | null;
  weight: number | null;
  equipment_type: string | null;
  raw_data: Record<string, unknown> | null;
};

export type SearchScoreResult = {
  id: number;
  company_id: number;
  dispatcher_user_id: number;
  load_snapshot_id: number;
  load_id: number;
  truck_search_session_id: number | null;
  score: number;
  breakdown: ScoreBreakdown | null;
  load_snapshot: LoadSnapshotSummary;
  created_at: string;
  updated_at: string;
};
