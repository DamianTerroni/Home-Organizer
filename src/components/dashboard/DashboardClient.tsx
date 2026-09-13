"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import MemberBarChart, { type MemberTotal } from "@/components/charts/MemberBarChart";
import CategoryPieChart, { type CategoryTotal } from "@/components/charts/CategoryPieChart";
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

export default function DashboardClient({
  expenses,
  incomes,
  members,
  categories,
  inviteCode,
  themeColor,
}: {
  expenses: ExpenseWithRelations[];
  incomes: IncomeWithRelations[];
  members: Member[];
  categories: Category[];
  inviteCode: string;
  themeColor: string;
}) {
  const [dateFrom, setDateFrom] = useState(startOfMonthISO());
  const [dateTo, setDateTo] = useState(endOfMonthISO());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (dateFrom && e.expense_date < dateFrom) return false;
      if (dateTo && e.expense_date > dateTo) return false;
      if (categoryFilter && e.category_id !== categoryFilter) return false;
      if (memberFilter && e.member_id !== memberFilter) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo, categoryFilter, memberFilter]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (dateFrom && i.income_date < dateFrom) return false;
      if (dateTo && i.income_date > dateTo) return false;
      if (memberFilter && i.member_id !== memberFilter) return false;
      return true;
    });
  }, [incomes, dateFrom, dateTo, memberFilter]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const savings = totalIncome - totalExpenses;

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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Gastado</p>
          <p className="text-2xl font-semibold">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Ingresado</p>
          <p className="text-2xl font-semibold">${totalIncome.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Ahorro</p>
          <p className={`text-2xl font-semibold ${savings < 0 ? "text-red-600" : ""}`}>${savings.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Código de invitación</p>
          <p className="text-2xl font-semibold tracking-widest">{inviteCode}</p>
        </div>
      </div>

      <Link href="/income" className="inline-block text-sm text-[var(--accent)] hover:underline">
        Ver / cargar ingresos →
      </Link>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Quién aportó más</h2>
        <MemberBarChart data={memberTotals} color={themeColor} />
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Gastos por categoría</h2>
        <CategoryPieChart data={categoryTotals} />
      </section>
    </main>
  );
}
