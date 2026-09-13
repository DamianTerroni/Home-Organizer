-- Migración 005 para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase.
-- Guarda las suscripciones de notificaciones push de cada integrante.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "select_own_push_subscriptions"
  on push_subscriptions for select
  using (user_id = auth.uid());

create policy "insert_own_push_subscriptions"
  on push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "delete_own_push_subscriptions"
  on push_subscriptions for delete
  using (user_id = auth.uid());
