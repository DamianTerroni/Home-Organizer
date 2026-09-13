import NavBar from "@/components/NavBar";
import SetupNeeded from "@/components/SetupNeeded";
import { requireHousehold } from "@/lib/session";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ "--accent": session.household.theme_color } as React.CSSProperties}
    >
      <NavBar householdName={session.household.name} />
      <div className="flex-1 pb-16 sm:pb-0">{children}</div>
    </div>
  );
}
