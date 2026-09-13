"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { createSaveExpense, deleteExpense, type ExpenseFormState } from "@/app/(main)/expenses/actions";
import { useHousehold } from "@/lib/HouseholdContext";
import { notifyHousehold } from "@/lib/notify";
import type { ExpenseWithRelations } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

const initialState: ExpenseFormState = {};

export default function ExpensesClient() {
  const { supabase, household, user, profile } = useHousehold();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithRelations | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAll = useCallback(async () => {
    await supabase.rpc("generate_due_recurring_expenses");

    const [{ data: expensesData }, { data: membersData }, { data: categoriesData }] = await Promise.all([
      supabase
        .from("expenses")
        .select("*, profiles!member_id(id, full_name), categories(id, name)")
        .eq("household_id", household.id)
        .order("expense_date", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
      supabase.from("categories").select("id, name").eq("household_id", household.id).order("name"),
    ]);

    setExpenses((expensesData ?? []) as ExpenseWithRelations[]);
    setMembers(membersData ?? []);
    setCategories(categoriesData ?? []);
    setLoading(false);
  }, [supabase, household.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount, not derived-state sync.
    fetchAll();
  }, [fetchAll]);

  const baseSaveExpense = useMemo(
    () => createSaveExpense(supabase, household.id, user.id),
    [supabase, household.id, user.id]
  );

  const saveExpense = useCallback(
    async (prevState: ExpenseFormState, formData: FormData) => {
      const isNew = !formData.get("id");
      const result = await baseSaveExpense(prevState, formData);
      if (!result.error) {
        await fetchAll();
        setShowForm(false);
        if (isNew) {
          const description = String(formData.get("description") ?? "");
          const amount = Number(formData.get("amount"));
          notifyHousehold(
            household.id,
            user.id,
            `Nuevo gasto de ${profile.full_name}`,
            `${description} · $${amount.toFixed(2)}`
          );
        }
      }
      return result;
    },
    [baseSaveExpense, fetchAll, household.id, user.id, profile.full_name]
  );

  const [formState, formAction, pending] = useActionState(saveExpense, initialState);

  async function handleDelete(id: string) {
    await deleteExpense(supabase, user.id, id);
    await fetchAll();
  }

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (minAmount && Number(e.amount) < Number(minAmount)) return false;
      if (memberFilter && e.member_id !== memberFilter) return false;
      if (categoryFilter && e.category_id !== categoryFilter) return false;
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      return true;
    });
  }, [expenses, minAmount, memberFilter, categoryFilter, dateFrom, dateTo]);

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

  function openAddForm() {
    setEditing(null);
    setShowNewCategory(false);
    setShowForm(true);
  }

  function openEditForm(expense: ExpenseWithRelations) {
    setEditing(expense);
    setShowNewCategory(false);
    setShowForm(true);
  }

  if (loading) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Cargando...</p>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Gastos y aportes</h1>
          <Link href="/expenses/recurring" className="text-xs text-[var(--accent)] hover:underline">
            Gastos recurrentes →
          </Link>
        </div>
        <button
          onClick={() => (showForm ? setShowForm(false) : openAddForm())}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

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
          <input
            name="expenseDate"
            type="date"
            defaultValue={editing?.expense_date ?? new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <select
            name="categoryId"
            defaultValue={editing?.category_id ?? ""}
            onChange={(e) => setShowNewCategory(e.target.value === "__new__")}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ Nueva categoría...</option>
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

          {showNewCategory && (
            <input
              name="newCategoryName"
              placeholder="Nombre de la categoría (ej. Internet/Teléfono)"
              required
              className="col-span-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
            />
          )}

          {!editing && (
            <label className="col-span-2 flex items-center gap-2 text-sm text-black/60 dark:text-white/60">
              <input type="checkbox" name="makeRecurring" className="h-4 w-4" />
              Repetir todos los meses (ej. alquiler, servicios)
            </label>
          )}

          {formState.error && (
            <p className="col-span-2 text-sm text-red-600">{formState.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="col-span-2 rounded-lg bg-[var(--accent)] py-2 font-medium text-white disabled:opacity-60"
          >
            {pending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar gasto"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          placeholder="Monto mínimo"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          className="w-32 rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
        />
        <select
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
        >
          <option value="">Todos los integrantes</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 text-sm text-black/50 dark:text-white/50">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
          />
          <span>a</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
          />
        </div>
        {(minAmount || memberFilter || categoryFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setMinAmount("");
              setMemberFilter("");
              setCategoryFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-sm text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-left dark:bg-white/10">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Quién pagó</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const isOwner = e.created_by === user.id;
              return (
                <tr key={e.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-3 py-2 whitespace-nowrap">{e.expense_date}</td>
                  <td className="px-3 py-2">{e.description}</td>
                  <td className="px-3 py-2">{e.categories?.name ?? "—"}</td>
                  <td className="px-3 py-2">{e.profiles?.full_name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">${Number(e.amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => openEditForm(e)}
                          className="mr-2 text-black/40 hover:text-[var(--accent)] dark:text-white/40"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-black/40 hover:text-red-600 dark:text-white/40"
                          title="Borrar"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-black/30 dark:text-white/30" title="Solo quien lo cargó puede editarlo">
                        🔒
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-black/50 dark:text-white/50">
                  No hay gastos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-black/10 font-semibold dark:border-white/15">
                <td colSpan={4} className="px-3 py-2 text-right">
                  Total
                </td>
                <td className="px-3 py-2 text-right">${total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </main>
  );
}
