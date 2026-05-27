import { AuthGate } from "@/features/auth/auth-gate";

export default function NotificationsPage() {
  return <AuthGate initialPage="notifications" />;
}
