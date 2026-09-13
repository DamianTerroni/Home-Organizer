"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MemberBarChart, { type MemberTotal } from "@/components/charts/MemberBarChart";
import CategoryPieChart, { type CategoryTotal } from "@/components/charts/CategoryPieChart";
import { useHousehold } from "@/lib/HouseholdContext";
import type { ExpenseWithRelations, IncomeWithRelations } from "@/lib/types";

type Member = { id: string; full_name: string };
type Category = { id: string; name: string };

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export default function DashboardClient() {
  const { supabase, household } = useHousehold();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [incomes, setIncomes] = useState<IncomeWithRelations[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [dateFrom, setDateFrom] = useState(startOfMonthISO());
  const [dateTo, setDateTo] = useState(endOfMonthISO());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await supabase.rpc("generate_due_recurring_expenses");

      const [{ data: expensesData }, { data: incomesData }, { data: membersData }, { data: categoriesData }] =
        await Promise.all([
          supabase
            .from("expenses")
            .select("*, profiles!member_id(id, full_name), categories(id, name)")
            .eq("household_id", household.id)
            .order("expense_date", { ascending: false }),
          supabase
            .from("incomes")
            .select("*, profiles!member_id(id, full_name)")
            .eq("household_id", household.id)
            .order("income_date", { ascending: false }),
          supabase.from("profiles").select("id, full_name").eq("household_id", household.id),
          supabase.from("categories").select("id, name").eq("household_id", household.id).order("name"),
        ]);

      if (cancelled) return;
      setExpenses((expensesData ?? []) as ExpenseWithRelations[]);
      setIncomes((incomesData ?? []) as IncomeWithRelations[]);
      setMembers(membersData ?? []);
      setCategories(categoriesData ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, household.id]);

  // Filtradas solo por fecha/categoría (sin integrante): la base para el
  // desglose por integrante, que siempre muestra a todos independientemente
  // del filtro de integrante de arriba.
  const dateCategoryExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      if (categoryFilter && e.category_id !== categoryFilter) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo, categoryFilter]);

  const dateIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (dateFrom && i.income_date < dateFrom) return false;
      if (dateTo && i.income_date > dateTo) return false;
      return true;
    });
  }, [incomes, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => {
    return dateCategoryExpenses.filter((e) => !memberFilter || e.member_id === memberFilter);
  }, [dateCategoryExpenses, memberFilter]);

  const filteredIncomes = useMemo(() => {
    return dateIncomes.filter((i) => !memberFilter || i.member_id === memberFilter);
  }, [dateIncomes, memberFilter]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const generalSavings = totalIncome - totalExpenses;

  const perMember = useMemo(() => {
    return members.map((m) => {
      const spent = dateCategoryExpenses
        .filter((e) => e.member_id === m.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const earned = dateIncomes
        .filter((i) => i.member_id === m.id)
        .reduce((sum, i) => sum + Number(i.amount), 0);
      return { id: m.id, name: m.full_name, spent, earned, savings: earned - spent };
    });
  }, [members, dateCategoryExpenses, dateIncomes]);

  const { memberTotals, categoryTotals } = useMemo(() => {
    const byMember = new Map<string, number>();
    const byCategory = new Map<string, number>();
    for (const e of filteredExpenses) {
      const memberName = e.profiles?.full_name ?? "Sin asignar";
      const categoryName = e.categories?.name ?? "Sin categoría";
      byMember.set(memberName, (byMember.get(memberName) ?? 0) + Number(e.amount));
      byCategory.set(categoryName, (byCategory.get(categoryName) ?? 0) + Number(e.amount));
    }
    const memberTotals: MemberTotal[] = [...byMember.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    const categoryTotals: CategoryTotal[] = [...byCategory.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
    return { memberTotals, categoryTotals };
  }, [filteredExpenses]);

  if (loading) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">Cargando...</p>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-3 text-sm dark:border-white/15">
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
          />
          <span className="text-black/50 dark:text-white/50">a</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-black/10 px-2 py-1.5 text-sm dark:border-white/15"
          />
        </div>
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
        <button
          onClick={() => {
            setDateFrom(startOfMonthISO());
            setDateTo(endOfMonthISO());
            setCategoryFilter("");
            setMemberFilter("");
          }}
          className="text-sm text-black/50 underline hover:text-black/70 dark:text-white/50 dark:hover:text-white/70"
        >
          Este mes
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Gastado</p>
          <p className="text-2xl font-semibold">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Ingresado</p>
          <p className="text-2xl font-semibold">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Ahorro general</p>
          <p className={`text-2xl font-semibold ${generalSavings < 0 ? "text-red-600" : ""}`}>
            ${generalSavings.toFixed(2)}
          </p>
        </div>
      </div>

      <Link href="/income" className="inline-block text-sm text-[var(--accent)] hover:underline">
        Ver / cargar ingresos →
      </Link>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Ahorro por integrante</h2>
        <p className="mb-3 text-xs text-black/50 dark:text-white/50">
          A cada ingreso se le resta solo lo que esa persona gastó, no el total del hogar.
        </p>
        <div className="space-y-2">
          {perMember.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
            >
              <span className="font-medium">{m.name}</span>
              <div className="flex gap-4 text-right">
                <div>
                  <p className="text-xs text-black/50 dark:text-white/50">Gastó</p>
                  <p>${m.spent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-black/50 dark:text-white/50">Ingresó</p>
                  <p>${m.earned.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-black/50 dark:text-white/50">Ahorro</p>
                  <p className={m.savings < 0 ? "text-red-600" : ""}>${m.savings.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Quién aportó más</h2>
        <MemberBarChart data={memberTotals} color={household.theme_color} />
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Gastos por categoría</h2>
        <CategoryPieChart data={categoryTotals} />
      </section>
    </main>
  );
}
