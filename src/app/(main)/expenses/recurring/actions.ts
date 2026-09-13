"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/session";

export type RecurringFormState = { error?: string };

export async function saveRecurringExpense(
  _prevState: RecurringFormState,
  formData: FormData
): Promise<RecurringFormState> {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return { error: "Supabase no está configurado." };
  const { supabase, household, user } = session;

  const id = String(formData.get("id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const memberId = String(formData.get("memberId") ?? "") || user.id;
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
      .eq("household_id", household.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("recurring_expenses").insert({
      household_id: household.id,
      description,
      amount,
      category_id: categoryId,
      member_id: memberId,
      day_of_month: dayOfMonth,
      created_by: user.id,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/expenses/recurring");
  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}

export async function toggleRecurringExpense(formData: FormData) {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return;

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await session.supabase
    .from("recurring_expenses")
    .update({ active: !active })
    .eq("id", id)
    .eq("household_id", session.household.id);

  revalidatePath("/expenses/recurring");
}

export async function deleteRecurringExpense(formData: FormData) {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await session.supabase.from("recurring_expenses").delete().eq("id", id).eq("created_by", session.user.id);

  revalidatePath("/expenses/recurring");
}
