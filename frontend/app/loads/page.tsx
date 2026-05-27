import { AuthGate } from "@/features/auth/auth-gate";

export default function LoadsPage() {
  return <AuthGate initialPage="live-loads" />;
}
