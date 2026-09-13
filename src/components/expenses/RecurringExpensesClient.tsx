"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  saveRecurringExpense,
  toggleRecurringExpense,
  deleteRecurringExpense,
  type RecurringFormState,
} from "@/app/(main)/expenses/recurring/actions";
import type { RecurringExpenseWithRelations } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

const initialState: RecurringFormState = {};

export default function RecurringExpensesClient({
  initialRecurring,
  members,
  categories,
  currentUserId,
}: {
  initialRecurring: RecurringExpenseWithRelations[];
  members: Member[];
  categories: Category[];
  currentUserId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringExpenseWithRelations | null>(null);
  const [formState, formAction, pending] = useActionState(saveRecurringExpense, initialState);

  function openAddForm() {
    setEditing(null);
    setShowForm(true);
  }

  function openEditForm(item: RecurringExpenseWithRelations) {
    setEditing(item);
    setShowForm(true);
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
            defaultValue={editing?.member_id ?? currentUserId}
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
        {initialRecurring.map((r) => {
          const isOwner = r.created_by === currentUserId;
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
                <form action={toggleRecurringExpense}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={String(r.active)} />
                  <button className="text-xs text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70">
                    {r.active ? "Pausar" : "Reactivar"}
                  </button>
                </form>
                {isOwner && (
                  <>
                    <button
                      onClick={() => openEditForm(r)}
                      className="text-black/40 hover:text-[var(--accent)] dark:text-white/40"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <form action={deleteRecurringExpense}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-black/40 hover:text-red-600 dark:text-white/40" title="Borrar">
                        ✕
                      </button>
                    </form>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {initialRecurring.length === 0 && (
          <p className="rounded-xl border border-black/10 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            No hay gastos recurrentes todavía.
          </p>
        )}
      </ul>
    </main>
  );
}
