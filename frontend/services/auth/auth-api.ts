import { AuthUser, LoginPayload, RegisterPayload } from "@/services/auth/auth-types";
import { readStoredJson, writeStoredJson } from "@/services/storage/persistence";

const usersKey = "freight-command-auth-users";
const sessionKey = "freight-command-auth-session";

// authApi is the frontend boundary for authentication.
// Replace these localStorage methods with /api/auth calls when backend auth is ready.
export const authApi = {
  currentUser(): AuthUser | null {
    const sessionId = window.localStorage.getItem(sessionKey);
    const users = readStoredJson<AuthUser[]>(usersKey, []);
    return users.find((user) => user.id === sessionId) ?? null;
  },
  login(_payload: LoginPayload) {
    throw new Error("authApi.login is reserved for backend integration.");
  },
  register(_payload: RegisterPayload) {
    throw new Error("authApi.register is reserved for backend integration.");
  },
  logout() {
    window.localStorage.removeItem(sessionKey);
  },
  persistUsers(users: AuthUser[]) {
    writeStoredJson(usersKey, users);
  }
};
