export type TruckRecord = {
  id: string;
  equipment: string;
  location: string;
  status: "available" | "loaded" | "service";
  driver: string;
  trackerState?: "moving" | "stopped";
  trackerCity?: string;
  trackerStateCode?: string;
  trackerNote?: string;
  trackerUpdatedAt?: number;
};
