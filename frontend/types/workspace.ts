import { type LucideIcon } from "lucide-react";
import { type WorkspacePage } from "@/store/workspace-store";

export type Tone = "green" | "cyan" | "amber" | "red" | "violet" | "slate";

export type SearchSession = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  equipment: string;
  minRpm: number;
  status: "running" | "paused" | "queued";
  createdAt?: number;
};

export type TruckUnit = {
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

export type DriverUnit = {
  name: string;
  phone: string;
  email: string;
  license: string;
  location: string;
  homeTerminal: string;
  status: "available" | "driving" | "calling" | "off";
  truck: string;
  loadsToday: number;
  completedToday: number;
  weeklyLoads: number;
  onTimeRate: number;
  avgRpm: number;
};

export type DriverDraft = {
  name: string;
  phone: string;
  email: string;
  license: string;
  location: string;
  homeTerminal: string;
};

export type TruckDraft = {
  id: string;
  equipment: string;
  location: string;
};

export type TrackerDraft = {
  trackerState: "moving" | "stopped";
  trackerCity: string;
  trackerStateCode: string;
  trackerNote: string;
};

export type SearchCenterResult = {
  id: string;
  title: string;
  body: string;
  type: string;
  tone: Tone;
  page: WorkspacePage;
  query: string;
  loadId?: string;
};

export type LoadAssignment = {
  id: string;
  loadId: string;
  driverName: string;
  assignedAt: number;
  status: "assigned" | "completed";
  completedAt?: number;
  score?: number;
  dispatcherComment?: string;
  driverComment?: string;
  issueLevel?: "none" | "minor" | "major";
  detentionMinutes?: number;
  proofNumber?: string;
};

export type CompletionDraft = {
  score: string;
  dispatcherComment: string;
  driverComment: string;
  issueLevel: "none" | "minor" | "major";
  detentionMinutes: string;
  proofNumber: string;
};

export type BrokerWorkflow = {
  watchedBrokerIds: string[];
  calledBrokerIds: string[];
  notesByBroker: Record<string, string[]>;
};

export type DriverUnitSummary = Omit<
  DriverUnit,
  "loadsToday" | "completedToday" | "weeklyLoads" | "onTimeRate" | "avgRpm"
>;

export type TruckUnitSummary = Pick<TruckUnit, "id" | "equipment" | "location" | "status" | "driver">;

export type LoadAssignmentSummary = Pick<LoadAssignment, "id" | "loadId" | "driverName" | "assignedAt" | "status" | "completedAt">;

export type CommandResult = {
  id: string;
  title: string;
  body: string;
  meta: string;
  tone: Tone;
  icon: LucideIcon;
  page: WorkspacePage;
  query: string;
  loadId?: string;
};
