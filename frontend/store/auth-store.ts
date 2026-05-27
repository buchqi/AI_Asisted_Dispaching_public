"use client";

import { create } from "zustand";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/api/api-client";
import { authApi } from "@/api/auth-api";
import { AuthUser, LoginPayload, RegisterPayload } from "@/types/auth";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  hasInitialized: boolean;
  initializeAuth: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: "",
  hasInitialized: false,
  initializeAuth: async () => {
    const token = getAccessToken();

    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false, hasInitialized: true });
      return;
    }

    set({ isLoading: true, error: "" });

    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false, hasInitialized: true });
    } catch {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isLoading: false, hasInitialized: true });
    }
  },
  login: async (payload) => {
    set({ isLoading: true, error: "" });

    try {
      const response = await authApi.login(payload);
      const token = getTokenFromResponse(response);

      if (!token) {
        throw new Error("Login response did not include an access token.");
      }

      setAccessToken(token);
      const user = response.user ?? await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false, hasInitialized: true });
    } catch (error) {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isLoading: false, hasInitialized: true, error: getMessage(error) });
      throw error;
    }
  },
  register: async (payload) => {
    set({ isLoading: true, error: "" });

    try {
      const response = await authApi.register(payload);
      const token = getTokenFromResponse(response);

      if (!token) {
        throw new Error("Registration response did not include an access token.");
      }

      setAccessToken(token);
      const user = response.user ?? await authApi.getMe();
      set({ user, isAuthenticated: true, isLoading: false, hasInitialized: true });
    } catch (error) {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isLoading: false, hasInitialized: true, error: getMessage(error) });
      throw error;
    }
  },
  logout: () => {
    clearAccessToken();
    set({ user: null, isAuthenticated: false, isLoading: false, error: "", hasInitialized: true });
  },
  clearError: () => set({ error: "" })
}));

function getTokenFromResponse(response: { access_token?: string; accessToken?: string; token?: string }) {
  return response.access_token ?? response.accessToken ?? response.token ?? "";
}

function getMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Authentication request failed.";
}
