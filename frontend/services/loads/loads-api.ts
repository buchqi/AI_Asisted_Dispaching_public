import { FreightLoad } from "@/entities/load/types";
import { mockLoads } from "@/entities/load/mock-loads";
import { readStoredJson } from "@/services/storage/persistence";

const dispatchLoadsStorageKey = "freight-command-dispatch-loads";

export const loadsApi = {
  listDispatchLoads(): FreightLoad[] {
    return readStoredJson<FreightLoad[]>(dispatchLoadsStorageKey, mockLoads);
  },
  listByDate(date: string): FreightLoad[] {
    return this.listDispatchLoads().filter((load) => new Date(load.receivedAt ?? load.updatedAt).toISOString().slice(0, 10) === date);
  }
};
