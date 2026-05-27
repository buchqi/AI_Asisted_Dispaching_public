import { AuthGate } from "@/components/auth/auth-gate";

// The home route is protected by a frontend auth gate.
// Backend auth can later replace the localStorage session implementation.
export default function Home() {
  return <AuthGate />;
}
