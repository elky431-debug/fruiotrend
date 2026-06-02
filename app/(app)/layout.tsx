import AppShell from "@/components/AppShell";
import { PaywallGuard } from "@/components/PaywallGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PaywallGuard>{children}</PaywallGuard>
    </AppShell>
  );
}
