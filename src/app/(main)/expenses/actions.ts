"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/session";

export type ExpenseFormState = { error?: string };

export async function addExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return { error: "Supabase no está configurado." };

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const memberId = String(formData.get("memberId") ?? "") || session.user.id;
  const expenseDate = String(formData.get("expenseDate") ?? "") || undefined;

  if (!description) return { error: "Ingresá una descripción." };
  if (!amount || amount <= 0) return { error: "Ingresá un monto válido." };

  const { error } = await session.supabase.from("expenses").insert({
    household_id: session.household.id,
    member_id: memberId,
    category_id: categoryId,
    description,
    amount,
    ...(expenseDate ? { expense_date: expenseDate } : {}),
  });

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}

export async function deleteExpense(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/expenses");
  revalidatePath("/");
}
