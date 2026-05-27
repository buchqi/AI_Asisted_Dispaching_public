import { apiClient } from "@/api/api-client";
import { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";

export const authApi = {
  register(payload: RegisterPayload) {
    return apiClient<AuthResponse>("/auth/register", {
      method: "POST",
      body: payload
    });
  },
  login(payload: LoginPayload) {
    const formData = new URLSearchParams();
    formData.set("username", payload.email);
    formData.set("password", payload.password);

    return apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: formData
    });
  },
  getMe() {
    return apiClient<AuthUser>("/auth/me");
  }
};
