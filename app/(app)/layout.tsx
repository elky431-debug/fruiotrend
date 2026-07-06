import AppShell from "@/components/AppShell";
import { CreditsProvider } from "@/hooks/useCredits";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreditsProvider>
      <AppShell>{children}</AppShell>
    </CreditsProvider>
  );
}
