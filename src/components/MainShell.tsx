"use client";

import NavBar from "@/components/NavBar";
import { useHousehold } from "@/lib/HouseholdContext";

export default function MainShell({ children }: { children: React.ReactNode }) {
  const { household } = useHousehold();

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ "--accent": household.theme_color } as React.CSSProperties}
    >
      <NavBar householdName={household.name} />
      <div className="flex-1 pb-16 sm:pb-0">{children}</div>
    </div>
  );
}
