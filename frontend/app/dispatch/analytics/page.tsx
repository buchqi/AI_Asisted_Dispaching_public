import { AuthGate } from "@/features/auth/auth-gate";

export default function AnalyticsPage() {
  return <AuthGate initialPage="analytics" />;
}
