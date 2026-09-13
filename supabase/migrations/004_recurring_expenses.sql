-- Migración 004 para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase.
-- Agrega gastos recurrentes (ej. alquiler, servicios) que se auto-cargan cada mes.

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid references categories(id) on delete set null,
  member_id uuid not null references profiles(id) on delete cascade,
  day_of_month int not null check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table expenses add column if not exists recurring_expense_id uuid references recurring_expenses(id) on delete set null;

alter table recurring_expenses enable row level security;

create policy "select_household_recurring_expenses"
  on recurring_expenses for select
  using (household_id = public.current_household_id());

create policy "insert_household_recurring_expenses"
  on recurring_expenses for insert
  with check (household_id = public.current_household_id());

create policy "update_household_recurring_expenses"
  on recurring_expenses for update
  using (household_id = public.current_household_id());

create policy "delete_own_recurring_expenses"
  on recurring_expenses for delete
  using (created_by = auth.uid());

-- Genera, para el hogar del usuario actual, el gasto del mes de cada
-- plantilla recurrente activa que todavía no lo tenga. Se llama sola
-- cada vez que alguien abre Gastos o el Resumen; no necesita un cron.
create or replace function public.generate_due_recurring_expenses()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_template record;
  v_target_date date;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    return;
  end if;

  for v_template in
    select * from recurring_expenses
    where household_id = v_household_id and active = true
  loop
    continue when exists (
      select 1 from expenses
      where recurring_expense_id = v_template.id
        and date_trunc('month', expense_date) = date_trunc('month', current_date)
    );

    v_target_date := date_trunc('month', current_date)::date + (v_template.day_of_month - 1);

    insert into expenses (household_id, member_id, category_id, created_by, description, amount, expense_date, recurring_expense_id)
    values (v_template.household_id, v_template.member_id, v_template.category_id, v_template.created_by, v_template.description, v_template.amount, v_target_date, v_template.id);
  end loop;
end;
$$;
