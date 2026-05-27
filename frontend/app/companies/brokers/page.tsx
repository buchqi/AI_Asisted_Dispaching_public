import { AuthGate } from "@/features/auth/auth-gate";

export default function BrokersPage() {
  return <AuthGate initialPage="brokers" />;
}
