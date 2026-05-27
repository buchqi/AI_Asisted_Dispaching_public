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
// accept. The frontend can call the same object locally while mocks are active.
export type SearchRequest = {
  query: string;
  category?: "All" | "Loads" | "Drivers" | "Trailers" | "Brokers" | "Assignments";
  limit?: number;
};
