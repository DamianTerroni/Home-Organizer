-- Migración 006 para "Hogar App". Pegar y ejecutar en el SQL Editor de Supabase.
-- Guarda en qué mercado fue cada compra y linkea el gasto generado con esa compra.

alter table shopping_trips add column if not exists store_name text;
alter table expenses add column if not exists shopping_trip_id uuid references shopping_trips(id) on delete set null;
