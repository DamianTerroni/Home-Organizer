import SetupNeeded from "@/components/SetupNeeded";
import ShoppingListClient from "@/components/shopping/ShoppingListClient";
import { requireHousehold } from "@/lib/session";
import type { ShoppingItem } from "@/lib/types";

export default async function ShoppingListPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household, user } = session;

  const [{ data: items }, { data: members }, { data: categories }] = await Promise.all([
    supabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", household.id)
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
    supabase.from("categories").select("id, name").eq("household_id", household.id),
  ]);

  return (
    <ShoppingListClient
      initialItems={(items ?? []) as ShoppingItem[]}
      householdId={household.id}
      currentUserId={user.id}
      members={members ?? []}
      categories={categories ?? []}
    />
  );
}
