export type AuthRole = "dispatcher" | "admin";

export type AuthUser = {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  timezone?: string | null;
  is_active?: boolean;
  role?: AuthRole | string;
  createdAt?: number | string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  first_name: string;
  last_name: string;
  phone: string;
  timezone: string;
};

export type AuthResponse = {
  access_token?: string;
  accessToken?: string;
  token?: string;
  user?: AuthUser;
};
