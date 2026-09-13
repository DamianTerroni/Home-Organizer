"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/session";

export type ExpenseFormState = { error?: string };

export async function saveExpense(
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return { error: "Supabase no está configurado." };
  const { supabase, household, user } = session;

  const id = String(formData.get("id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const memberId = String(formData.get("memberId") ?? "") || user.id;
  const expenseDate = String(formData.get("expenseDate") ?? "") || undefined;
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();
  let categoryId = String(formData.get("categoryId") ?? "") || null;

  if (!description) return { error: "Ingresá una descripción." };
  if (!amount || amount <= 0) return { error: "Ingresá un monto válido." };

  if (categoryId === "__new__") {
    if (!newCategoryName) return { error: "Ingresá el nombre de la nueva categoría." };
    const { data: newCategory, error: categoryError } = await supabase
      .from("categories")
      .insert({ household_id: household.id, name: newCategoryName })
      .select()
      .single();
    if (categoryError) return { error: "No se pudo crear la categoría." };
    categoryId = newCategory.id;
  }

  if (id) {
    const { error } = await supabase
      .from("expenses")
      .update({
        description,
        amount,
        category_id: categoryId,
        member_id: memberId,
        ...(expenseDate ? { expense_date: expenseDate } : {}),
      })
      .eq("id", id)
      .eq("created_by", user.id);
    if (error) return { error: error.message };
  } else {
    const makeRecurring = formData.get("makeRecurring") === "on";

    const { data: inserted, error } = await supabase
      .from("expenses")
      .insert({
        household_id: household.id,
        member_id: memberId,
        category_id: categoryId,
        created_by: user.id,
        description,
        amount,
        ...(expenseDate ? { expense_date: expenseDate } : {}),
      })
      .select()
      .single();
    if (error) return { error: error.message };

    if (makeRecurring && inserted) {
      const dayOfMonth = Math.min(Number(inserted.expense_date.split("-")[2]), 28);
      const { data: template, error: recurringError } = await supabase
        .from("recurring_expenses")
        .insert({
          household_id: household.id,
          description,
          amount,
          category_id: categoryId,
          member_id: memberId,
          day_of_month: dayOfMonth,
          created_by: user.id,
        })
        .select()
        .single();
      if (!recurringError && template) {
        await supabase.from("expenses").update({ recurring_expense_id: template.id }).eq("id", inserted.id);
      }
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  return {};
}

export async function deleteExpense(formData: FormData) {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await session.supabase.from("expenses").delete().eq("id", id).eq("created_by", session.user.id);

  revalidatePath("/expenses");
  revalidatePath("/");
}
