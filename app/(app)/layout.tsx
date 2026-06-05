import AppShell from "@/components/AppShell";
import { PaywallGuard } from "@/components/PaywallGuard";
import { CreditsProvider } from "@/hooks/useCredits";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreditsProvider>
      <AppShell>
        <PaywallGuard>{children}</PaywallGuard>
      </AppShell>
    </CreditsProvider>
  );
}
