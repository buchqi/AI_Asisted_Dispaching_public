import { apiClient } from "@/api/api-client";

export type DispatcherLoadActionType = "save" | "reject" | "favorite" | "contacted" | "cleared";

export type DispatcherActionResponse = {
  id: number;
  company_id: number;
  truck_search_session_id: number;
  load_id: number;
  load_snapshot_id: number;
  dispatcher_user_id: number;
  action_type: DispatcherLoadActionType;
  created_at: string;
};

export type DispatcherActionLoad = {
  dispatcher_action_id: number;
  action_type: "save" | "contacted";
  created_at: string;
  truck_search_session_id: number;
  load_id: number;
  load_snapshot_id: number;
  load: {
    id: number;
    broker_name: string | null;
    equipment_type: string | null;
    origin_city: string | null;
    origin_state: string | null;
    destination_city: string | null;
    destination_state: string | null;
    pickup_date: string | null;
    delivery_date: string | null;
  };
  load_snapshot: {
    id: number;
    posted_rate: number | null;
    miles: number | null;
    weight: number | null;
    pickup_date: string | null;
    delivery_date: string | null;
    raw_payload: Record<string, unknown> | null;
  };
  source: {
    load_board_name: string | null;
    contact_phone: string | null;
  };
};

export function listDispatcherActionLoads(companyId: number | string) {
  return apiClient<DispatcherActionLoad[]>(`/companies/${companyId}/dispatcher-action-loads`);
}

function postLoadAction(truckSearchSessionId: number | string, loadId: number | string, action: "save" | "reject" | "favorite" | "contacted") {
  return apiClient<DispatcherActionResponse>(`/truck-search-sessions/${truckSearchSessionId}/loads/${loadId}/${action}`, {
    method: "POST"
  });
}

export function clearLoadAction(truckSearchSessionId: number | string, loadId: number | string) {
  return apiClient<DispatcherActionResponse>(`/truck-search-sessions/${truckSearchSessionId}/loads/${loadId}/clear-action`, {
    method: "POST"
  });
}

export function saveLoad(truckSearchSessionId: number | string, loadId: number | string) {
  return postLoadAction(truckSearchSessionId, loadId, "save");
}

export function rejectLoad(truckSearchSessionId: number | string, loadId: number | string) {
  return postLoadAction(truckSearchSessionId, loadId, "reject");
}

export function favoriteLoad(truckSearchSessionId: number | string, loadId: number | string) {
  return postLoadAction(truckSearchSessionId, loadId, "favorite");
}

export function markLoadContacted(truckSearchSessionId: number | string, loadId: number | string) {
  return postLoadAction(truckSearchSessionId, loadId, "contacted");
}

export const dispatcherActionsApi = {
  listDispatcherActionLoads,
  saveLoad,
  rejectLoad,
  favoriteLoad,
  markLoadContacted,
  clearLoadAction
};
