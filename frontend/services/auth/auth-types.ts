export type AuthRole = "dispatcher" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  company: string;
  role: AuthRole;
  createdAt: number;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  name: string;
  company: string;
};
