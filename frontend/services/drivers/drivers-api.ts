import { DriverRecord } from "@/services/drivers/drivers-types";
import { readStoredJson } from "@/services/storage/persistence";

const driversStorageKey = "freight-command-drivers";

export const driversApi = {
  list(): DriverRecord[] {
    return readStoredJson<DriverRecord[]>(driversStorageKey, []);
  },
  search(query: string): DriverRecord[] {
    const normalized = query.trim().toLowerCase();
    return this.list().filter((driver) =>
      [driver.name, driver.phone, driver.email, driver.license, driver.location, driver.homeTerminal, driver.status, driver.truck]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }
};
