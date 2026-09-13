import SetupNeeded from "@/components/SetupNeeded";
import MemberBarChart, { type MemberTotal } from "@/components/charts/MemberBarChart";
import CategoryPieChart, { type CategoryTotal } from "@/components/charts/CategoryPieChart";
import { requireHousehold } from "@/lib/session";
import type { ExpenseWithRelations } from "@/lib/types";

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const session = await requireHousehold();
  if (session.status === "unconfigured") return <SetupNeeded />;
  const { supabase, household } = session;

  const { data } = await supabase
    .from("expenses")
    .select("*, profiles(id, full_name), categories(id, name)")
    .eq("household_id", household.id)
    .gte("expense_date", startOfMonthISO())
    .order("expense_date", { ascending: false });

  const expenses = (data ?? []) as ExpenseWithRelations[];

  const totalThisMonth = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byMember = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
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

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Gastado este mes</p>
          <p className="text-2xl font-semibold">${totalThisMonth.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
          <p className="text-xs text-black/50 dark:text-white/50">Código de invitación</p>
          <p className="text-2xl font-semibold tracking-widest">{household.invite_code}</p>
        </div>
      </div>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Quién aportó más este mes</h2>
        <MemberBarChart data={memberTotals} />
      </section>

      <section className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="mb-3 text-sm font-semibold">Gastos por categoría este mes</h2>
        <CategoryPieChart data={categoryTotals} />
      </section>
    </main>
  );
}
