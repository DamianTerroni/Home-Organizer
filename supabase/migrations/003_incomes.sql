-- Migración 003 para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase.
-- Agrega el registro opcional de ingresos (sueldo, etc.) para poder ver el ahorro.

create table incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  income_date date not null default current_date,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table incomes enable row level security;

create policy "select_household_incomes"
  on incomes for select
  using (household_id = public.current_household_id());

create policy "insert_household_incomes"
  on incomes for insert
  with check (household_id = public.current_household_id());

create policy "update_own_incomes"
  on incomes for update
  using (created_by = auth.uid());

create policy "delete_own_incomes"
  on incomes for delete
  using (created_by = auth.uid());
