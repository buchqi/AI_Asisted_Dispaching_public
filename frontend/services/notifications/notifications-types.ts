import { FreightLoad } from "@/entities/load/types";

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  priority: "new-load";
  source: "live-loads";
  load?: FreightLoad;
  read: boolean;
  createdAt: number;
};
