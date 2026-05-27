import { AuthGate } from "@/features/auth/auth-gate";

export default function AssignmentsPage() {
  return <AuthGate initialPage="assignments" />;
}
