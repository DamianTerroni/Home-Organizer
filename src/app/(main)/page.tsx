import SetupNeeded from "@/components/SetupNeeded";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { requireHousehold } from "@/lib/session";
import type { ExpenseWithRelations, IncomeWithRelations } from "@/lib/types";

export default async function DashboardPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household } = session;

  await supabase.rpc("generate_due_recurring_expenses");

  const [{ data: expenses }, { data: incomes }, { data: members }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, profiles!member_id(id, full_name), categories(id, name)")
      .eq("household_id", household.id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("incomes")
      .select("*, profiles!member_id(id, full_name)")
      .eq("household_id", household.id)
      .order("income_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
    supabase.from("categories").select("id, name").eq("household_id", household.id).order("name"),
  ]);

  return (
    <DashboardClient
      expenses={(expenses ?? []) as ExpenseWithRelations[]}
      incomes={(incomes ?? []) as IncomeWithRelations[]}
      members={members ?? []}
      categories={categories ?? []}
      themeColor={household.theme_color}
    />
  );
}
