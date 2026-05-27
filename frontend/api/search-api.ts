import { apiClient } from "@/api/api-client";
import { SearchBatch, SearchScoreResult, StartSearchPayload, TruckSearchSession } from "@/types/search";

export function startSearch(payload: StartSearchPayload) {
  return apiClient<SearchBatch>("/searches/start", {
    method: "POST",
    body: payload
  });
}

export function getSearchBatch(searchBatchId: number | string) {
  return apiClient<SearchBatch>(`/searches/${searchBatchId}`);
}

export function getTruckSessionsForBatch(searchBatchId: number | string) {
  return apiClient<TruckSearchSession[]>(`/searches/${searchBatchId}/truck-sessions`);
}

export function getTruckSearchSession(truckSearchSessionId: number | string) {
  return apiClient<TruckSearchSession>(`/truck-search-sessions/${truckSearchSessionId}`);
}

export function cancelTruckSearchSession(truckSearchSessionId: number | string) {
  return apiClient<TruckSearchSession>(`/truck-search-sessions/${truckSearchSessionId}/cancel`, {
    method: "POST"
  });
}

export function deleteTruckSearchSession(truckSearchSessionId: number | string) {
  return apiClient<void>(`/truck-search-sessions/${truckSearchSessionId}`, {
    method: "DELETE"
  });
}

export function getTruckSearchSessionScores(truckSearchSessionId: number | string) {
  return apiClient<SearchScoreResult[]>(`/truck-search-sessions/${truckSearchSessionId}/scores`);
}

export const searchApi = {
  startSearch,
  getSearchBatch,
  getTruckSessionsForBatch,
  getTruckSearchSession,
  cancelTruckSearchSession,
  deleteTruckSearchSession,
  getTruckSearchSessionScores
};
