import type { SupabaseClient } from "@supabase/supabase-js";

export type IncomeFormState = { error?: string };

export function createSaveIncome(supabase: SupabaseClient, householdId: string, userId: string) {
  return async function saveIncome(
    _prevState: IncomeFormState,
    formData: FormData
  ): Promise<IncomeFormState> {
    const id = String(formData.get("id") ?? "") || null;
    const category = String(formData.get("category") ?? "").trim();
    const amount = Number(formData.get("amount"));
    const memberId = String(formData.get("memberId") ?? "") || userId;
    const incomeDate = String(formData.get("incomeDate") ?? "") || undefined;

    if (!category) return { error: "Ingresá una categoría (ej. Sueldo)." };
    if (!amount || amount <= 0) return { error: "Ingresá un monto válido." };

    if (id) {
      const { error } = await supabase
        .from("incomes")
        .update({
          category,
          amount,
          member_id: memberId,
          ...(incomeDate ? { income_date: incomeDate } : {}),
        })
        .eq("id", id)
        .eq("created_by", userId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("incomes").insert({
        household_id: householdId,
        member_id: memberId,
        created_by: userId,
        category,
        amount,
        ...(incomeDate ? { income_date: incomeDate } : {}),
      });
      if (error) return { error: error.message };
    }

    return {};
  };
}

export async function deleteIncome(supabase: SupabaseClient, userId: string, id: string) {
  await supabase.from("incomes").delete().eq("id", id).eq("created_by", userId);
}
