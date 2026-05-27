import { TruckRecord } from "@/services/trucks/trucks-types";
import { readStoredJson } from "@/services/storage/persistence";

const trucksStorageKey = "freight-command-trucks";

export const trucksApi = {
  list(): TruckRecord[] {
    return readStoredJson<TruckRecord[]>(trucksStorageKey, []);
  },
  search(query: string): TruckRecord[] {
    const normalized = query.trim().toLowerCase();
    return this.list().filter((truck) =>
      [truck.id, truck.equipment, truck.location, truck.status, truck.driver, truck.trackerCity, truck.trackerStateCode, truck.trackerNote, truck.trackerState]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }
};
