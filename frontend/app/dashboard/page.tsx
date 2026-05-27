import { AuthGate } from "@/features/auth/auth-gate";

export default function DashboardPage() {
  return <AuthGate initialPage="dispatch" />;
}
