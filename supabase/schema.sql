-- Esquema para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase
-- en un proyecto NUEVO (sin estas tablas todavía).
--
-- Si tu proyecto ya corrió una versión anterior de este archivo, no vuelvas
-- a correr este archivo entero: mirá supabase/migrations/ y corré solo las
-- migraciones que todavía no aplicaste.

create extension if not exists pgcrypto;

-- ── Tablas ──────────────────────────────────────────────────────────────

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  theme_color text not null default '#0d9488',
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
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
  created_by uuid references profiles(id) on delete set null,
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

create table shopping_trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  completed_by uuid references profiles(id) on delete set null,
  paid_by uuid references profiles(id) on delete set null,
  amount numeric(12,2),
  items jsonb not null,
  completed_at timestamptz not null default now()
);

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

create table theme_proposals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  proposed_by uuid references profiles(id) on delete set null,
  color text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table theme_proposal_votes (
  proposal_id uuid not null references theme_proposals(id) on delete cascade,
  member_id uuid not null references profiles(id) on delete cascade,
  approve boolean not null,
  voted_at timestamptz not null default now(),
  primary key (proposal_id, member_id)
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

-- ── Paleta de colores del hogar, con aprobación de todos los integrantes ─

create or replace function public.propose_theme_color(p_color text)
returns theme_proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_proposal theme_proposals;
begin
  select household_id into v_household_id from profiles where id = auth.uid();
  if v_household_id is null then
    raise exception 'No pertenecés a ningún hogar';
  end if;

  insert into theme_proposals (household_id, proposed_by, color)
  values (v_household_id, auth.uid(), p_color)
  returning * into v_proposal;

  insert into theme_proposal_votes (proposal_id, member_id, approve)
  values (v_proposal.id, auth.uid(), true);

  -- si sos el único integrante, se aprueba solo
  if (select count(*) from profiles where household_id = v_household_id) <= 1 then
    update households set theme_color = p_color where id = v_household_id;
    update theme_proposals set status = 'approved' where id = v_proposal.id
      returning * into v_proposal;
  end if;

  return v_proposal;
end;
$$;

create or replace function public.vote_theme_proposal(p_proposal_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_proposal theme_proposals;
  v_total_members int;
  v_approvals int;
begin
  select household_id into v_household_id from profiles where id = auth.uid();

  select * into v_proposal from theme_proposals
    where id = p_proposal_id and household_id = v_household_id and status = 'pending';

  if not found then
    raise exception 'Propuesta no encontrada o ya resuelta';
  end if;

  insert into theme_proposal_votes (proposal_id, member_id, approve)
  values (p_proposal_id, auth.uid(), p_approve)
  on conflict (proposal_id, member_id) do update set approve = excluded.approve, voted_at = now();

  if p_approve = false then
    update theme_proposals set status = 'rejected' where id = p_proposal_id;
    return;
  end if;

  select count(*) into v_total_members from profiles where household_id = v_household_id;
  select count(*) into v_approvals from theme_proposal_votes
    where proposal_id = p_proposal_id and approve = true;

  if v_approvals >= v_total_members then
    update theme_proposals set status = 'approved' where id = p_proposal_id;
    update households set theme_color = v_proposal.color where id = v_household_id;
  end if;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────

alter table households enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table expenses enable row level security;
alter table shopping_items enable row level security;
alter table shopping_trips enable row level security;
alter table incomes enable row level security;
alter table theme_proposals enable row level security;
alter table theme_proposal_votes enable row level security;

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

create policy "update_own_expenses"
  on expenses for update
  using (created_by = auth.uid());

create policy "delete_own_expenses"
  on expenses for delete
  using (created_by = auth.uid());

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

create policy "select_household_shopping_trips"
  on shopping_trips for select
  using (household_id = public.current_household_id());

create policy "insert_household_shopping_trips"
  on shopping_trips for insert
  with check (household_id = public.current_household_id());

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

create policy "select_household_theme_proposals"
  on theme_proposals for select
  using (household_id = public.current_household_id());

create policy "select_household_theme_votes"
  on theme_proposal_votes for select
  using (proposal_id in (select id from theme_proposals where household_id = public.current_household_id()));

-- ── Storage: fotos de perfil ─────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatar_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Realtime para la lista de compras compartida ───────────────────────

alter publication supabase_realtime add table shopping_items;
