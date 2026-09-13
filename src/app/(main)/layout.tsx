import HouseholdProvider from "@/lib/HouseholdContext";
import MainShell from "@/components/MainShell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <HouseholdProvider>
      <MainShell>{children}</MainShell>
    </HouseholdProvider>
  );
}
