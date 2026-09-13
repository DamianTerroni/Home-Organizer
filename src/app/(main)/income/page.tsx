import SetupNeeded from "@/components/SetupNeeded";
import IncomeClient from "@/components/income/IncomeClient";
import { requireHousehold } from "@/lib/session";
import type { IncomeWithRelations } from "@/lib/types";

export default async function IncomePage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household, user } = session;

  const [{ data: incomes }, { data: members }] = await Promise.all([
    supabase
      .from("incomes")
      .select("*, profiles!member_id(id, full_name)")
      .eq("household_id", household.id)
      .order("income_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
  ]);

  return (
    <IncomeClient
      initialIncomes={(incomes ?? []) as IncomeWithRelations[]}
      members={members ?? []}
      currentUserId={user.id}
    />
  );
}
