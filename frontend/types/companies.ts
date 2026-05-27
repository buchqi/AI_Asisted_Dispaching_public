export type Company = {
  id: number;
  name: string;
};

export type CreateCompanyPayload = {
  name: string;
};

export type CompanyMember = {
  id: number;
  user_id: number;
  company_id: number;
  role: string;
  status: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  user?: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    timezone?: string | null;
  };
};

export type InviteCompanyMemberPayload = {
  email: string;
  role?: string;
};

export type UpdateCompanyMemberPayload = {
  role?: string;
  status?: string;
};
