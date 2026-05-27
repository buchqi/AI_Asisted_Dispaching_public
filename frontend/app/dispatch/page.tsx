import { AuthGate } from "@/features/auth/auth-gate";

export default function DispatchPage() {
  return <AuthGate initialPage="dispatch" />;
}
