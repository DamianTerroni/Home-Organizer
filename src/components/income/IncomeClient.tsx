"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { createSaveIncome, deleteIncome, type IncomeFormState } from "@/app/(main)/income/actions";
import { useHousehold } from "@/lib/HouseholdContext";
import type { IncomeWithRelations } from "@/lib/types";

type Member = { id: string; full_name: string };

const initialState: IncomeFormState = {};

export default function IncomeClient() {
  const { supabase, household, user } = useHousehold();

  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<IncomeWithRelations[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IncomeWithRelations | null>(null);
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAll = useCallback(async () => {
    const [{ data: incomesData }, { data: membersData }] = await Promise.all([
      supabase
        .from("incomes")
        .select("*, profiles!member_id(id, full_name)")
        .eq("household_id", household.id)
        .order("income_date", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
    ]);

    setIncomes((incomesData ?? []) as IncomeWithRelations[]);
    setMembers(membersData ?? []);
    setLoading(false);
  }, [supabase, household.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount, not derived-state sync.
    fetchAll();
  }, [fetchAll]);

  const baseSave = useMemo(
    () => createSaveIncome(supabase, household.id, user.id),
    [supabase, household.id, user.id]
  );

  const saveIncome = useCallback(
    async (prevState: IncomeFormState, formData: FormData) => {
      const result = await baseSave(prevState, formData);
      if (!result.error) {
        await fetchAll();
        setShowForm(false);
      }
      return result;
    },
    [baseSave, fetchAll]
  );

  const [formState, formAction, pending] = useActionState(saveIncome, initialState);

  async function handleDelete(id: string) {
    await deleteIncome(supabase, user.id, id);
    await fetchAll();
  }

  const filtered = useMemo(() => {
    return incomes.filter((i) => {
      if (memberFilter && i.member_id !== memberFilter) return false;
      if (dateFrom && i.income_date < dateFrom) return false;
      if (dateTo && i.income_date > dateTo) return false;
      return true;
    });
  }, [incomes, memberFilter, dateFrom, dateTo]);

  const total = filtered.reduce((sum, i) => sum + Number(i.amount), 0);

  function openAddForm() {
    setEditing(null);
    setShowForm(true);
  }

  function openEditForm(income: IncomeWithRelations) {
    setEditing(income);
    setShowForm(true);
  }

  if (loading) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Cargando...</p>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Ingresos</h1>
          <Link href="/" className="text-xs text-[var(--accent)] hover:underline">
            ← Volver al resumen
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
            name="category"
            placeholder="Categoría (ej. Sueldo, Panny 3D)"
            required
            defaultValue={editing?.category}
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
            name="incomeDate"
            type="date"
            defaultValue={editing?.income_date ?? new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
          />
          <select
            name="memberId"
            defaultValue={editing?.member_id ?? user.id}
            className="col-span-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
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
            {pending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar ingreso"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-sm">
          <thead className="bg-black/5 text-left dark:bg-white/10">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Integrante</th>
              <th className="px-3 py-2 text-right">Monto</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const isOwner = i.created_by === user.id;
              return (
                <tr key={i.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-3 py-2 whitespace-nowrap">{i.income_date}</td>
                  <td className="px-3 py-2">{i.category}</td>
                  <td className="px-3 py-2">{i.profiles?.full_name ?? "—"}</td>
                  <td className="px-3 py-2 text-right">${Number(i.amount).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {isOwner ? (
                      <>
                        <button
                          onClick={() => openEditForm(i)}
                          className="mr-2 text-black/40 hover:text-[var(--accent)] dark:text-white/40"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(i.id)}
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
                <td colSpan={5} className="px-3 py-6 text-center text-black/50 dark:text-white/50">
                  No hay ingresos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-black/10 font-semibold dark:border-white/15">
                <td colSpan={3} className="px-3 py-2 text-right">
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
