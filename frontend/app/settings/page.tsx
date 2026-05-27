import { AuthGate } from "@/features/auth/auth-gate";

export default function SettingsPage() {
  return <AuthGate initialPage="settings" />;
}
