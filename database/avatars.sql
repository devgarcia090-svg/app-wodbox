-- ============================================================
-- WodBox — Avatares con foto
-- Pega en: Supabase → SQL Editor → New query → Run query
-- ============================================================

-- 1. Añadir columna avatar_url a profiles
alter table public.profiles
  add column if not exists avatar_url text;

-- 2. Crear bucket de avatares (público)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. Políticas de almacenamiento
drop policy if exists "Public read avatars"      on storage.objects;
drop policy if exists "Users upload own avatar"  on storage.objects;
drop policy if exists "Users update own avatar"  on storage.objects;
drop policy if exists "Users delete own avatar"  on storage.objects;

create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
