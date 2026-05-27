import { apiClient } from "@/api/api-client";
import { CreateTruckPayload, Truck, UpdateTruckPayload } from "@/types/trucks";

export function listTrucks(companyId: number | string) {
  return apiClient<Truck[]>(`/companies/${companyId}/trucks`);
}

export function createTruck(companyId: number | string, payload: CreateTruckPayload) {
  return apiClient<Truck>(`/companies/${companyId}/trucks`, {
    method: "POST",
    body: payload
  });
}

export function getTruck(companyId: number | string, truckId: number | string) {
  return apiClient<Truck>(`/companies/${companyId}/trucks/${truckId}`);
}

export function updateTruck(companyId: number | string, truckId: number | string, payload: UpdateTruckPayload) {
  return apiClient<Truck>(`/companies/${companyId}/trucks/${truckId}`, {
    method: "PATCH",
    body: payload
  });
}

export function assignTruckDriver(companyId: number | string, truckId: number | string, driverId: number | null) {
  return apiClient<Truck>(`/companies/${companyId}/trucks/${truckId}/assign-driver`, {
    method: "POST",
    body: { driver_id: driverId }
  });
}

export const trucksApi = {
  listTrucks,
  createTruck,
  getTruck,
  updateTruck,
  assignTruckDriver
};

