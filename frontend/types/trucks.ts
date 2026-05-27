export type Truck = {
  id: number;
  company_id: number;
  truck_id: string;
  current_driver_id?: number | null;
  current_driver_name?: string | null;
  current_driver_surname?: string | null;
  equipment_type?: string | null;
  status: string;
  notes?: string | null;
};

export type CreateTruckPayload = {
  truck_id: string;
  current_driver_id?: number | null;
  equipment_type?: string | null;
  status?: string;
  notes?: string | null;
};

export type UpdateTruckPayload = Partial<CreateTruckPayload>;

