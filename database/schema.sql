-- ============================================================
-- WodBox — Supabase Schema
-- Pega todo este bloque en: Supabase → SQL Editor → New query
-- ============================================================

-- 1. Tabla profiles (extiende auth.users)
create table if not exists public.profiles (
  id              uuid        references auth.users on delete cascade primary key,
  name            text        not null,
  role            text        not null default 'athlete' check (role in ('athlete', 'admin')),
  avatar_initials text,
  avatar_color    text        default '#f95c00',
  created_at      timestamptz default now()
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile"    on public.profiles;
drop policy if exists "Users can update own profile"  on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Trigger: crea perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role, avatar_initials, avatar_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name',         split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role',         'athlete'),
    upper(left(coalesce(new.raw_user_meta_data ->> 'name', 'U'), 2)),
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#f95c00')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- PASO 2: Crear los 4 usuarios demo
-- ============================================================
-- Ve a: Authentication → Users → Add user (botón verde)
-- Crea estos 4 usuarios:
--
--   carlos@wodbox.com   / carlos123
--   ana@wodbox.com      / ana123
--   admin@wodbox.com    / admin123
--   sara@wodbox.com     / sara123
--
-- Después vuelve aquí y ejecuta el bloque de abajo:
-- ============================================================


-- ============================================================
-- PASO 3: Insertar perfiles de los usuarios demo
-- (ejecuta DESPUÉS de crear los usuarios en el paso 2)
-- ============================================================

insert into public.profiles (id, name, role, avatar_initials, avatar_color)
select
  id,
  case email
    when 'carlos@wodbox.com' then 'Carlos'
    when 'ana@wodbox.com'    then 'Ana'
    when 'admin@wodbox.com'  then 'Admin'
    when 'sara@wodbox.com'   then 'Sara'
  end,
  case email
    when 'admin@wodbox.com' then 'admin'
    when 'sara@wodbox.com'  then 'admin'
    else 'athlete'
  end,
  case email
    when 'carlos@wodbox.com' then 'CM'
    when 'ana@wodbox.com'    then 'AN'
    when 'admin@wodbox.com'  then 'AD'
    when 'sara@wodbox.com'   then 'SM'
  end,
  case email
    when 'sara@wodbox.com' then '#8b5cf6'
    else '#f95c00'
  end
from auth.users
where email in (
  'carlos@wodbox.com',
  'ana@wodbox.com',
  'admin@wodbox.com',
  'sara@wodbox.com'
)
on conflict (id) do update set
  name            = excluded.name,
  role            = excluded.role,
  avatar_initials = excluded.avatar_initials,
  avatar_color    = excluded.avatar_color;
