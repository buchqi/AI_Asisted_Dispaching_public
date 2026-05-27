import { AuthGate } from "@/features/auth/auth-gate";

export default function SearchPage() {
  return <AuthGate initialPage="search-sessions" />;
}
