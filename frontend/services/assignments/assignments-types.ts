export type AssignmentRecord = {
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
