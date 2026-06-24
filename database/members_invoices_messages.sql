-- ============================================================
-- WodBox — Miembros, Facturas, Mensajes e Invitaciones
-- Pega en: Supabase → SQL Editor → New query → Run query
-- ============================================================

-- 1. Añadir campos de membresía a profiles
alter table public.profiles
  add column if not exists plan              text    default 'Sin plan',
  add column if not exists membership_status text    default 'inactive'
    check (membership_status in ('active','pending','inactive')),
  add column if not exists membership_expires date;

-- Política de admin para editar perfiles
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());


-- 2. Invitaciones pendientes (atletas invitados aún sin cuenta)
create table if not exists public.pending_invites (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null unique,
  name        text        not null,
  plan        text        not null default 'Sin plan',
  invited_at  timestamptz default now()
);

alter table public.pending_invites enable row level security;

drop policy if exists "Admins manage invites" on public.pending_invites;
create policy "Admins manage invites"
  on public.pending_invites for all
  using (public.is_admin())
  with check (public.is_admin());


-- 3. Trigger actualizado: aplica invite pendiente si existe
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_invite public.pending_invites;
begin
  select * into v_invite from public.pending_invites where email = new.email;

  insert into public.profiles (id, name, role, avatar_initials, avatar_color, plan, membership_status)
  values (
    new.id,
    coalesce(v_invite.name, new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'athlete'),
    upper(left(coalesce(v_invite.name, new.raw_user_meta_data ->> 'name', 'U'), 2)),
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#f95c00'),
    coalesce(v_invite.plan, new.raw_user_meta_data ->> 'plan', 'Sin plan'),
    case when v_invite.id is not null then 'active' else 'inactive' end
  );

  if v_invite.id is not null then
    delete from public.pending_invites where id = v_invite.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. Facturas
create table if not exists public.invoices (
  id          uuid          primary key default gen_random_uuid(),
  member_id   uuid          references public.profiles on delete set null,
  number      text          not null unique,
  date        date          not null default current_date,
  plan_name   text          not null,
  amount      numeric(10,2) not null,
  paid        boolean       not null default true,
  created_at  timestamptz   default now()
);

alter table public.invoices enable row level security;

drop policy if exists "Athletes view own invoices" on public.invoices;
drop policy if exists "Admins manage all invoices" on public.invoices;

create policy "Athletes view own invoices"
  on public.invoices for select
  using (auth.uid() = member_id);

create policy "Admins manage all invoices"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());


-- 5. Conversaciones (un atleta ↔ el box)
create table if not exists public.conversations (
  id              uuid        primary key default gen_random_uuid(),
  athlete_id      uuid        references public.profiles on delete cascade not null unique,
  last_preview    text        default '',
  last_at         timestamptz default now(),
  unread_admin    int         not null default 0,
  unread_athlete  int         not null default 0,
  created_at      timestamptz default now()
);

alter table public.conversations enable row level security;

drop policy if exists "Athlete manages own conv"  on public.conversations;
drop policy if exists "Admins view all convs"      on public.conversations;
drop policy if exists "Admins update all convs"    on public.conversations;

create policy "Athlete manages own conv"
  on public.conversations for all
  using (auth.uid() = athlete_id)
  with check (auth.uid() = athlete_id);

create policy "Admins view all convs"
  on public.conversations for select
  using (public.is_admin());

create policy "Admins update all convs"
  on public.conversations for update
  using (public.is_admin());


-- 6. Mensajes (DM o broadcast)
create table if not exists public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        references public.conversations on delete cascade,
  sender_id       uuid        references public.profiles on delete set null,
  text            text        not null,
  is_broadcast    boolean     not null default false,
  created_at      timestamptz default now()
);

alter table public.messages enable row level security;

drop policy if exists "All auth see broadcasts"       on public.messages;
drop policy if exists "Athletes see own DMs"          on public.messages;
drop policy if exists "Admins see all messages"       on public.messages;
drop policy if exists "Authenticated insert messages" on public.messages;

create policy "All auth see broadcasts"
  on public.messages for select
  using (is_broadcast = true and auth.role() = 'authenticated');

create policy "Athletes see own DMs"
  on public.messages for select
  using (
    is_broadcast = false and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.athlete_id = auth.uid()
    )
  );

create policy "Admins see all messages"
  on public.messages for select
  using (public.is_admin());

create policy "Authenticated insert messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);


-- ============================================================
-- SEED: perfiles demo
-- ============================================================
update public.profiles set
  plan = 'Ilimitado', membership_status = 'active', membership_expires = '2026-08-01'
where id = (select id from auth.users where email = 'carlos@wodbox.com');

update public.profiles set
  plan = '10 Clases', membership_status = 'active', membership_expires = '2026-07-15'
where id = (select id from auth.users where email = 'ana@wodbox.com');


-- ============================================================
-- SEED: facturas
-- ============================================================
insert into public.invoices (id, member_id, number, date, plan_name, amount, paid)
select '00000000-0000-0000-0002-000000000001', p.id, 'FAC-2026-024', '2026-06-01', 'Ilimitado', 55.00, true
from public.profiles p join auth.users u on u.id = p.id where u.email = 'carlos@wodbox.com'
on conflict (number) do nothing;

insert into public.invoices (id, member_id, number, date, plan_name, amount, paid)
select '00000000-0000-0000-0002-000000000002', p.id, 'FAC-2026-023', '2026-06-01', '10 Clases', 45.00, true
from public.profiles p join auth.users u on u.id = p.id where u.email = 'ana@wodbox.com'
on conflict (number) do nothing;

insert into public.invoices (id, member_id, number, date, plan_name, amount, paid)
select '00000000-0000-0000-0002-000000000003', p.id, 'FAC-2026-019', '2026-05-01', 'Ilimitado', 55.00, false
from public.profiles p join auth.users u on u.id = p.id where u.email = 'carlos@wodbox.com'
on conflict (number) do nothing;


-- ============================================================
-- SEED: conversación + mensajes
-- ============================================================
insert into public.conversations (id, athlete_id, last_preview, last_at, unread_admin)
select '00000000-0000-0000-0003-000000000001', p.id,
  '¿Puedo cambiar mi membresía a 3 días?', now() - interval '2 hours', 1
from public.profiles p join auth.users u on u.id = p.id where u.email = 'carlos@wodbox.com'
on conflict (athlete_id) do nothing;

insert into public.messages (id, conversation_id, sender_id, text, is_broadcast, created_at)
select '00000000-0000-0000-0004-000000000001',
  '00000000-0000-0000-0003-000000000001', p.id,
  '¿Puedo cambiar mi membresía a 3 días?', false, now() - interval '2 hours'
from public.profiles p join auth.users u on u.id = p.id where u.email = 'carlos@wodbox.com'
on conflict (id) do nothing;

insert into public.messages (id, conversation_id, sender_id, text, is_broadcast, created_at)
select '00000000-0000-0000-0004-000000000002', null, p.id,
  '¡Buenos días equipo! 🔥 Hoy la clase de las 12:00 está completa. Plaza para las 18:00 disponible.',
  true, now() - interval '8 hours'
from public.profiles p join auth.users u on u.id = p.id where u.email = 'admin@wodbox.com'
on conflict (id) do nothing;

insert into public.messages (id, conversation_id, sender_id, text, is_broadcast, created_at)
select '00000000-0000-0000-0004-000000000003', null, p.id,
  '🏆 ¡Enhorabuena a Carlos y Ana por su PR en Clean & Jerk! Así se trabaja 💪',
  true, now() - interval '1 day'
from public.profiles p join auth.users u on u.id = p.id where u.email = 'admin@wodbox.com'
on conflict (id) do nothing;


-- ============================================================
-- NOTA REALTIME: Para chat en tiempo real:
-- Dashboard → Database → Replication → activar INSERT en "messages"
-- ============================================================
