"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/session";

export type IncomeFormState = { error?: string };

export async function saveIncome(
  _prevState: IncomeFormState,
  formData: FormData
): Promise<IncomeFormState> {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return { error: "Supabase no está configurado." };
  const { supabase, household, user } = session;

  const id = String(formData.get("id") ?? "") || null;
  const category = String(formData.get("category") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const memberId = String(formData.get("memberId") ?? "") || user.id;
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
      .eq("created_by", user.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("incomes").insert({
      household_id: household.id,
      member_id: memberId,
      created_by: user.id,
      category,
      amount,
      ...(incomeDate ? { income_date: incomeDate } : {}),
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/income");
  revalidatePath("/");
  return {};
}

export async function deleteIncome(formData: FormData) {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await session.supabase.from("incomes").delete().eq("id", id).eq("created_by", session.user.id);

  revalidatePath("/income");
  revalidatePath("/");
}
