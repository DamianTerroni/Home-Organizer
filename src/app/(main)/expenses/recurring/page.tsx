import SetupNeeded from "@/components/SetupNeeded";
import RecurringExpensesClient from "@/components/expenses/RecurringExpensesClient";
import { requireHousehold } from "@/lib/session";
import type { RecurringExpenseWithRelations } from "@/lib/types";

export default async function RecurringExpensesPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household, user } = session;

  const [{ data: recurring }, { data: members }, { data: categories }] = await Promise.all([
    supabase
      .from("recurring_expenses")
      .select("*, profiles!member_id(id, full_name), categories(id, name)")
      .eq("household_id", household.id)
      .order("day_of_month"),
    supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
    supabase.from("categories").select("id, name").eq("household_id", household.id).order("name"),
  ]);

  return (
    <RecurringExpensesClient
      initialRecurring={(recurring ?? []) as RecurringExpenseWithRelations[]}
      members={members ?? []}
      categories={categories ?? []}
      currentUserId={user.id}
    />
  );
}
