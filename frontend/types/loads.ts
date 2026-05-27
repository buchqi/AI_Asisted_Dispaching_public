export type LoadDecisionPayload = {
  loadId: string;
  status: "accepted" | "rejected";
  reason?: string;
  note?: string;
};
