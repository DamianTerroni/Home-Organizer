-- Esquema para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase.

create extension if not exists pgcrypto;

-- ── Tablas ──────────────────────────────────────────────────────────────

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  household_id uuid references households(id) on delete set null,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity text,
  is_checked boolean not null default false,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── Perfil automático al registrarse ───────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Helper: household del usuario actual ───────────────────────────────

create or replace function public.current_household_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- ── Crear / unirse a un hogar (RPC) ────────────────────────────────────

create or replace function public.create_household(p_name text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
  v_code text;
begin
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into households (name, invite_code) values (p_name, v_code)
  returning * into v_household;

  update profiles set household_id = v_household.id where id = auth.uid();

  insert into categories (household_id, name)
  values
    (v_household.id, 'Alquiler'),
    (v_household.id, 'Mercado'),
    (v_household.id, 'Servicios'),
    (v_household.id, 'Transporte'),
    (v_household.id, 'Hogar'),
    (v_household.id, 'Salud'),
    (v_household.id, 'Ocio'),
    (v_household.id, 'Otros');

  return v_household;
end;
$$;

create or replace function public.join_household(p_invite_code text)
returns households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household households;
begin
  select * into v_household from households where invite_code = upper(p_invite_code);

  if not found then
    raise exception 'Código de invitación inválido';
  end if;

  update profiles set household_id = v_household.id where id = auth.uid();

  return v_household;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────

alter table households enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table expenses enable row level security;
alter table shopping_items enable row level security;

create policy "select_own_household"
  on households for select
  using (id = public.current_household_id());

create policy "select_household_profiles"
  on profiles for select
  using (id = auth.uid() or household_id = public.current_household_id());

create policy "update_own_profile"
  on profiles for update
  using (id = auth.uid());

create policy "select_household_categories"
  on categories for select
  using (household_id = public.current_household_id());

create policy "insert_household_categories"
  on categories for insert
  with check (household_id = public.current_household_id());

create policy "select_household_expenses"
  on expenses for select
  using (household_id = public.current_household_id());

create policy "insert_household_expenses"
  on expenses for insert
  with check (household_id = public.current_household_id());

create policy "update_household_expenses"
  on expenses for update
  using (household_id = public.current_household_id());

create policy "delete_household_expenses"
  on expenses for delete
  using (household_id = public.current_household_id());

create policy "select_household_shopping_items"
  on shopping_items for select
  using (household_id = public.current_household_id());

create policy "insert_household_shopping_items"
  on shopping_items for insert
  with check (household_id = public.current_household_id());

create policy "update_household_shopping_items"
  on shopping_items for update
  using (household_id = public.current_household_id());

create policy "delete_household_shopping_items"
  on shopping_items for delete
  using (household_id = public.current_household_id());

-- ── Realtime para la lista de compras compartida ───────────────────────

alter publication supabase_realtime add table shopping_items;
