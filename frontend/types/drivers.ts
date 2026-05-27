export type Driver = {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  home_location?: string | null;
  preferences?: string | null;
  notes?: string | null;
  status: string;
};

export type CreateDriverPayload = {
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  home_location?: string | null;
  preferences?: string | null;
  notes?: string | null;
};

export type UpdateDriverPayload = Partial<CreateDriverPayload> & {
  status?: string;
};

