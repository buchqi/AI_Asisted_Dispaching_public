import { FreightLoad } from "@/types/load";

export const loadsApi = {
  listDispatchLoads(): FreightLoad[] {
    return [];
  },
  listByDate(date: string): FreightLoad[] {
    return this.listDispatchLoads().filter((load) => new Date(load.receivedAt ?? load.updatedAt).toISOString().slice(0, 10) === date);
  }
};
