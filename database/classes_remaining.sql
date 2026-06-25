-- Añadir columna classes_remaining a profiles
-- Pega en: Supabase → SQL Editor → New query → Run query

alter table public.profiles
  add column if not exists classes_remaining integer;
