"use client";

import { useActionState, useMemo, useState } from "react";
import { saveExpense, deleteExpense, type ExpenseFormState } from "@/app/(main)/expenses/actions";
import type { ExpenseWithRelations } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

const initialState: ExpenseFormState = {};

export default function ExpensesClient({
  initialExpenses,
  members,
  categories,
  currentUserId,
}: {
  initialExpenses: ExpenseWithRelations[];
  members: Member[];
  categories: Category[];
  currentUserId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExpenseWithRelations | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formState, formAction, pending] = useActionState(saveExpense, initialState);

  const filtered = useMemo(() => {
    return initialExpenses.filter((e) => {
      if (minAmount && Number(e.amount) < Number(minAmount)) return false;
      if (memberFilter && e.member_id !== memberFilter) return false;
      if (categoryFilter && e.category_id !== categoryFilter) return false;
      return true;
    });
  }, [initialExpenses, minAmount, memberFilter, categoryFilter]);

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

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Gastos y aportes</h1>
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
            defaultValue={editing?.member_id ?? currentUserId}
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
              const isOwner = e.created_by === currentUserId;
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
                        <form action={deleteExpense} className="inline">
                          <input type="hidden" name="id" value={e.id} />
                          <button className="text-black/40 hover:text-red-600 dark:text-white/40" title="Borrar">
                            ✕
                          </button>
                        </form>
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
