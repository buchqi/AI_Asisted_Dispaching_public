import { AuthGate } from "@/features/auth/auth-gate";

export default function TrucksPage() {
  return <AuthGate initialPage="trucks" />;
}
