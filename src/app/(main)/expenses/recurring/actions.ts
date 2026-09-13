import type { SupabaseClient } from "@supabase/supabase-js";

export type RecurringFormState = { error?: string };

export function createSaveRecurringExpense(supabase: SupabaseClient, householdId: string, userId: string) {
  return async function saveRecurringExpense(
    _prevState: RecurringFormState,
    formData: FormData
  ): Promise<RecurringFormState> {
    const id = String(formData.get("id") ?? "") || null;
    const description = String(formData.get("description") ?? "").trim();
    const amount = Number(formData.get("amount"));
    const categoryId = String(formData.get("categoryId") ?? "") || null;
    const memberId = String(formData.get("memberId") ?? "") || userId;
    const dayOfMonth = Number(formData.get("dayOfMonth"));

    if (!description) return { error: "Ingresá una descripción." };
    if (!amount || amount <= 0) return { error: "Ingresá un monto válido." };
    if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 28) {
      return { error: "El día del mes tiene que ser entre 1 y 28." };
    }

    if (id) {
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ description, amount, category_id: categoryId, member_id: memberId, day_of_month: dayOfMonth })
        .eq("id", id)
        .eq("household_id", householdId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("recurring_expenses").insert({
        household_id: householdId,
        description,
        amount,
        category_id: categoryId,
        member_id: memberId,
        day_of_month: dayOfMonth,
        created_by: userId,
      });
      if (error) return { error: error.message };
    }

    return {};
  };
}

export async function toggleRecurringExpense(
  supabase: SupabaseClient,
  householdId: string,
  id: string,
  active: boolean
) {
  await supabase
    .from("recurring_expenses")
    .update({ active: !active })
    .eq("id", id)
    .eq("household_id", householdId);
}

export async function deleteRecurringExpense(supabase: SupabaseClient, userId: string, id: string) {
  await supabase.from("recurring_expenses").delete().eq("id", id).eq("created_by", userId);
}
