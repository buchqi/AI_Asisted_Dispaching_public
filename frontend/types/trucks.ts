export type Truck = {
  id: number;
  company_id: number;
  truck_id: string;
  current_driver_id?: number | null;
  current_driver_name?: string | null;
  current_driver_surname?: string | null;
  equipment_type?: string | null;
  status: string;
  current_location?: string | null;
  available_from?: string | null;
  max_deadhead_miles?: number | null;
  min_rpm?: number | null;
  max_weight?: number | null;
  preferred_broker_sources?: string[];
  notes?: string | null;
};

export type CreateTruckPayload = {
  truck_id: string;
  current_driver_id?: number | null;
  equipment_type?: string | null;
  status?: string;
  current_location?: string | null;
  available_from?: string | null;
  max_deadhead_miles?: number | null;
  min_rpm?: number | null;
  max_weight?: number | null;
  preferred_broker_sources?: string[];
  notes?: string | null;
};

export type UpdateTruckPayload = Partial<CreateTruckPayload>;
