"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import {
  createSaveRecurringExpense,
  toggleRecurringExpense,
  deleteRecurringExpense,
  type RecurringFormState,
} from "@/app/(main)/expenses/recurring/actions";
import { useHousehold } from "@/lib/HouseholdContext";
import type { RecurringExpenseWithRelations } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

const initialState: RecurringFormState = {};

export default function RecurringExpensesClient() {
  const { supabase, household, user } = useHousehold();

  const [loading, setLoading] = useState(true);
  const [recurring, setRecurring] = useState<RecurringExpenseWithRelations[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringExpenseWithRelations | null>(null);

  const fetchAll = useCallback(async () => {
    const [{ data: recurringData }, { data: membersData }, { data: categoriesData }] = await Promise.all([
      supabase
        .from("recurring_expenses")
        .select("*, profiles!member_id(id, full_name), categories(id, name)")
        .eq("household_id", household.id)
        .order("day_of_month"),
      supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
      supabase.from("categories").select("id, name").eq("household_id", household.id).order("name"),
    ]);

    setRecurring((recurringData ?? []) as RecurringExpenseWithRelations[]);
    setMembers(membersData ?? []);
    setCategories(categoriesData ?? []);
    setLoading(false);
  }, [supabase, household.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount, not derived-state sync.
    fetchAll();
  }, [fetchAll]);

  const baseSave = useMemo(
    () => createSaveRecurringExpense(supabase, household.id, user.id),
    [supabase, household.id, user.id]
  );

  const saveRecurringExpense = useCallback(
    async (prevState: RecurringFormState, formData: FormData) => {
      const result = await baseSave(prevState, formData);
      if (!result.error) {
        await fetchAll();
        setShowForm(false);
      }
      return result;
    },
    [baseSave, fetchAll]
  );

  const [formState, formAction, pending] = useActionState(saveRecurringExpense, initialState);

  async function handleToggle(id: string, active: boolean) {
    await toggleRecurringExpense(supabase, household.id, id, active);
    await fetchAll();
  }

  async function handleDelete(id: string) {
    await deleteRecurringExpense(supabase, user.id, id);
    await fetchAll();
  }

  function openAddForm() {
    setEditing(null);
    setShowForm(true);
  }

  function openEditForm(item: RecurringExpenseWithRelations) {
    setEditing(item);
    setShowForm(true);
  }

  if (loading) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Cargando...</p>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Gastos recurrentes</h1>
          <Link href="/expenses" className="text-xs text-[var(--accent)] hover:underline">
            ← Volver a gastos
          </Link>
        </div>
        <button
          onClick={() => (showForm ? setShowForm(false) : openAddForm())}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      <p className="text-sm text-black/50 dark:text-white/50">
        Se auto-cargan como un gasto normal el día que elijas de cada mes, la próxima vez que alguien
        abra la app. Podés pausarlas o editarlas cuando quieras.
      </p>

      {showForm && (
        <form
          key={editing?.id ?? "new"}
          action={formAction}
          className="grid grid-cols-2 gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <input
            name="description"
            placeholder="Descripción (ej. Alquiler)"
            required
            defaultValue={editing?.description}
            className="col-span-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Monto"
            required
            defaultValue={editing?.amount}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-black/50 dark:text-white/50">Día del mes</label>
            <input
              name="dayOfMonth"
              type="number"
              min="1"
              max="28"
              required
              defaultValue={editing?.day_of_month ?? 1}
              className="w-16 rounded-lg border border-black/10 px-2 py-2 dark:border-white/15"
            />
          </div>
          <select
            name="categoryId"
            defaultValue={editing?.category_id ?? ""}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="memberId"
            defaultValue={editing?.member_id ?? user.id}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>

          {formState.error && <p className="col-span-2 text-sm text-red-600">{formState.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="col-span-2 rounded-lg bg-[var(--accent)] py-2 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar"}
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {recurring.map((r) => {
          const isOwner = r.created_by === user.id;
          return (
            <li
              key={r.id}
              className={`flex items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-sm dark:border-white/15 ${
                r.active ? "" : "opacity-50"
              }`}
            >
              <div>
                <p className="font-medium">{r.description}</p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  ${Number(r.amount).toFixed(2)} · día {r.day_of_month} · {r.profiles?.full_name ?? "—"}
                  {r.categories && <> · {r.categories.name}</>}
                  {!r.active && <> · pausado</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(r.id, r.active)}
                  className="text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
                >
                  {r.active ? "Pausar" : "Reactivar"}
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => openEditForm(r)}
                      className="text-black/40 hover:text-[var(--accent)] dark:text-white/40"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-black/40 hover:text-red-600 dark:text-white/40"
                      title="Borrar"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {recurring.length === 0 && (
          <p className="rounded-xl border border-black/10 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            No hay gastos recurrentes todavía.
          </p>
        )}
      </ul>
    </main>
  );
}
