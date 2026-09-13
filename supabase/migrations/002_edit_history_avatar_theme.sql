-- Migración 002 para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase
-- (el proyecto ya tiene el schema.sql original corrido; esto solo agrega lo nuevo).

-- ── 1) Gastos: solo quien cargó el gasto puede editarlo/borrarlo ───────

alter table expenses add column if not exists created_by uuid references profiles(id) on delete set null;
update expenses set created_by = member_id where created_by is null;

drop policy if exists "update_household_expenses" on expenses;
drop policy if exists "delete_household_expenses" on expenses;

create policy "update_own_expenses"
  on expenses for update
  using (created_by = auth.uid());

create policy "delete_own_expenses"
  on expenses for delete
  using (created_by = auth.uid());

-- ── 2) Perfiles: foto/ícono ─────────────────────────────────────────────

alter table profiles add column if not exists avatar_url text;

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

-- ── 3) Historial de compras (lo que se compró al cerrar la lista) ──────

create table shopping_trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  completed_by uuid references profiles(id) on delete set null,
  paid_by uuid references profiles(id) on delete set null,
  amount numeric(12,2),
  items jsonb not null,
  completed_at timestamptz not null default now()
);

alter table shopping_trips enable row level security;

create policy "select_household_shopping_trips"
  on shopping_trips for select
  using (household_id = public.current_household_id());

create policy "insert_household_shopping_trips"
  on shopping_trips for insert
  with check (household_id = public.current_household_id());

-- ── 4) Paleta de colores del hogar, con aprobación de todos ────────────

alter table households add column if not exists theme_color text not null default '#0d9488';

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

alter table theme_proposals enable row level security;
alter table theme_proposal_votes enable row level security;

create policy "select_household_theme_proposals"
  on theme_proposals for select
  using (household_id = public.current_household_id());

create policy "select_household_theme_votes"
  on theme_proposal_votes for select
  using (proposal_id in (select id from theme_proposals where household_id = public.current_household_id()));

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
