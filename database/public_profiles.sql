-- Expone solo los campos no sensibles de un perfil (nombre y avatar) a
-- cualquier usuario autenticado, sin tocar las políticas de RLS de
-- `profiles` (que siguen limitando el acceso a la fila completa a uno
-- mismo o a un admin).
--
-- Motivo: las políticas de `profiles` solo permiten leer la fila propia
-- o, si eres admin, cualquiera. Un atleta no podía leer el perfil de
-- otro atleta ni el de un admin. Esto rompía en silencio (con datos por
-- defecto tipo "Atleta"/"?"):
--   - la lista de asistentes de una clase (solo te veías a ti mismo),
--   - el leaderboard de resultados WOD (los rivales salían como "Atleta"),
--   - el nombre/avatar del admin en los mensajes de chat del atleta.
-- Pega en: Supabase → SQL Editor → New query → Run query

create or replace function public.public_profiles(p_ids uuid[])
returns table (id uuid, name text, avatar_initials text, avatar_color text, avatar_url text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.name, p.avatar_initials, p.avatar_color, p.avatar_url
  from public.profiles p
  where p.id = any(p_ids);
$$;

grant execute on function public.public_profiles(uuid[]) to authenticated;
