import { apiClient } from "@/api/api-client";
import { CreateDriverPayload, Driver, UpdateDriverPayload } from "@/types/drivers";

export function listDrivers(companyId: number | string) {
  return apiClient<Driver[]>(`/companies/${companyId}/drivers`);
}

export function createDriver(companyId: number | string, payload: CreateDriverPayload) {
  return apiClient<Driver>(`/companies/${companyId}/drivers`, {
    method: "POST",
    body: payload
  });
}

export function getDriver(companyId: number | string, driverId: number | string) {
  return apiClient<Driver>(`/companies/${companyId}/drivers/${driverId}`);
}

export function updateDriver(companyId: number | string, driverId: number | string, payload: UpdateDriverPayload) {
  return apiClient<Driver>(`/companies/${companyId}/drivers/${driverId}`, {
    method: "PATCH",
    body: payload
  });
}

export const driversApi = {
  listDrivers,
  createDriver,
  getDriver,
  updateDriver
};

