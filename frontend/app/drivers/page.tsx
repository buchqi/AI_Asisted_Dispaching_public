import { AuthGate } from "@/features/auth/auth-gate";

export default function DriversPage() {
  return <AuthGate initialPage="drivers" />;
}
