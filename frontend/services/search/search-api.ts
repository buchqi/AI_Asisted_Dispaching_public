import { mockBrokerProfiles, mockLoads } from "@/entities/load/mock-loads";
import { readStoredJson } from "@/services/storage/persistence";
import { SearchRequest, SearchResult } from "@/services/search/types";

type DriverRecord = {
  name: string;
  phone: string;
  email: string;
  license: string;
  location: string;
  homeTerminal: string;
  status: string;
  truck: string;
};

type TruckRecord = {
  id: string;
  equipment: string;
  location: string;
  status: string;
  driver: string;
  trackerCity?: string;
  trackerStateCode?: string;
  trackerNote?: string;
};

type AssignmentRecord = {
  id: string;
  loadId: string;
  driverName: string;
  status: "assigned" | "completed";
};

const driversStorageKey = "freight-command-drivers";
const trucksStorageKey = "freight-command-trucks";
const assignmentsStorageKey = "freight-command-load-assignments";

// searchApi is the backend-ready boundary for all search data.
// Today it reads mock/localStorage data. When backend is ready, replace the
// internals with fetch("/api/search?...") and keep the SearchResult contract.
export const searchApi = {
  search(request: SearchRequest): SearchResult[] {
    const query = request.query.trim().toLowerCase();
    const limit = request.limit ?? 24;
    const category = request.category ?? "All";
    const drivers = readStoredJson<DriverRecord[]>(driversStorageKey, []);
    const trucks = readStoredJson<TruckRecord[]>(trucksStorageKey, []);
    const assignments = readStoredJson<AssignmentRecord[]>(assignmentsStorageKey, []);
    const results: SearchResult[] = [];
    const include = (value: SearchRequest["category"]) => category === "All" || category === value;
    const pushIfMatch = (categoryName: SearchRequest["category"], result: SearchResult, haystack: string) => {
      if (!include(categoryName)) {
        return;
      }
      if (!query || haystack.toLowerCase().includes(query)) {
        results.push(result);
      }
    };

    mockLoads.forEach((load) => {
      const assignment = assignments.find((item) => item.loadId === load.id);
      const meta = assignment?.status ?? load.status;
      pushIfMatch(
        "Loads",
        {
          id: `load-${load.id}`,
          domain: "load",
          title: `${load.id} / ${load.pickup} -> ${load.delivery}`,
          body: `${load.broker} / ${load.company} / ${load.phone} / ${load.equipment} / ${assignment?.driverName ?? "unassigned"}`,
          meta,
          tone: meta === "completed" ? "green" : meta === "assigned" ? "amber" : load.hot ? "red" : "cyan",
          page: "live-loads",
          query: load.id,
          loadId: load.id
        },
        `${load.id} ${load.pickup} ${load.delivery} ${load.broker} ${load.company} ${load.phone} ${load.equipment} ${meta} ${assignment?.driverName ?? ""}`
      );
    });

    drivers.forEach((driver) => {
      const assignment = assignments.find((item) => item.status === "assigned" && item.driverName === driver.name);
      pushIfMatch(
        "Drivers",
        {
          id: `driver-${driver.name}`,
          domain: "driver",
          title: driver.name,
          body: `${driver.phone} / ${driver.license} / ${driver.location} / ${driver.truck} / ${assignment?.loadId ?? driver.status}`,
          meta: assignment ? "assigned" : driver.status,
          tone: assignment ? "cyan" : driver.status === "available" ? "green" : "amber",
          page: "drivers",
          query: driver.name,
          driverId: driver.name
        },
        `${driver.name} ${driver.phone} ${driver.email} ${driver.license} ${driver.location} ${driver.homeTerminal} ${driver.status} ${driver.truck} ${assignment?.loadId ?? ""}`
      );
    });

    trucks.forEach((truck) => {
      const assignment = assignments.find((item) => item.status === "assigned" && item.driverName === truck.driver);
      const trackerText = `${truck.trackerCity ?? truck.location} ${truck.trackerStateCode ?? ""} ${truck.trackerNote ?? ""}`;
      const meta = truck.status === "service" ? "stopped" : assignment || truck.status === "loaded" ? "in transit" : truck.status;
      pushIfMatch(
        "Trailers",
        {
          id: `truck-${truck.id}`,
          domain: "truck",
          title: `${truck.id} / ${meta}`,
          body: `${truck.equipment} / ${trackerText} / driver ${truck.driver}${assignment ? ` / load ${assignment.loadId}` : ""}`,
          meta,
          tone: meta === "stopped" ? "red" : meta === "in transit" ? "cyan" : "green",
          page: "trucks",
          query: truck.id,
          truckId: truck.id
        },
        `${truck.id} ${truck.equipment} ${truck.location} ${truck.status} ${truck.driver} ${trackerText} ${meta} stopped moving in transit ${assignment?.loadId ?? ""}`
      );
    });

    Object.values(mockBrokerProfiles).forEach((broker) => {
      pushIfMatch(
        "Brokers",
        {
          id: `broker-${broker.broker}`,
          domain: "broker",
          title: broker.broker,
          body: `${broker.company} / ${broker.phone} / ${broker.email} / score ${broker.score}`,
          meta: "broker",
          tone: broker.score >= 84 ? "green" : "amber",
          page: "brokers",
          query: broker.broker,
          brokerId: broker.broker
        },
        `${broker.broker} ${broker.company} ${broker.phone} ${broker.email}`
      );
    });

    assignments.forEach((assignment) => {
      const load = mockLoads.find((item) => item.id === assignment.loadId);
      pushIfMatch(
        "Assignments",
        {
          id: `assignment-${assignment.id}`,
          domain: "assignment",
          title: `${assignment.loadId} / ${assignment.driverName}`,
          body: `${assignment.status} / ${load ? `${load.pickup} -> ${load.delivery}` : "load details unavailable"} / ${load?.broker ?? ""}`,
          meta: assignment.status,
          tone: assignment.status === "completed" ? "green" : "amber",
          page: "assignments",
          query: assignment.loadId,
          loadId: assignment.loadId,
          assignmentId: assignment.id
        },
        `${assignment.loadId} ${assignment.driverName} ${assignment.status} ${load?.pickup ?? ""} ${load?.delivery ?? ""} ${load?.broker ?? ""}`
      );
    });

    return results.slice(0, limit);
  }
};
