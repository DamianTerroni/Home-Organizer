import SetupNeeded from "@/components/SetupNeeded";
import ExpensesClient from "@/components/expenses/ExpensesClient";
import { requireHousehold } from "@/lib/session";
import type { ExpenseWithRelations } from "@/lib/types";

export default async function ExpensesPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household, user } = session;

  const [{ data: expenses }, { data: members }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, profiles(id, full_name), categories(id, name)")
      .eq("household_id", household.id)
      .order("expense_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
    supabase.from("categories").select("id, name").eq("household_id", household.id).order("name"),
  ]);

  return (
    <ExpensesClient
      initialExpenses={(expenses ?? []) as ExpenseWithRelations[]}
      members={members ?? []}
      categories={categories ?? []}
      currentUserId={user.id}
    />
  );
}
