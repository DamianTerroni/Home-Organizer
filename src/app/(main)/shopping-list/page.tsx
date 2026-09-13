import SetupNeeded from "@/components/SetupNeeded";
import ShoppingListClient from "@/components/shopping/ShoppingListClient";
import { requireHousehold } from "@/lib/session";
import type { ShoppingItem } from "@/lib/types";

export default async function ShoppingListPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household, user } = session;

  const { data } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  return (
    <ShoppingListClient
      initialItems={(data ?? []) as ShoppingItem[]}
      householdId={household.id}
      currentUserId={user.id}
    />
  );
}
