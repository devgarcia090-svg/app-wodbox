-- ============================================================
-- WodBox — Clases y Reservas
-- Pega en: Supabase → SQL Editor → New query → Run query
-- ============================================================

-- Helper: detectar si el usuario actual es admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 1. Tabla clases
create table if not exists public.classes (
  id        uuid    primary key default gen_random_uuid(),
  name      text    not null,
  date      date    not null,
  time      text    not null,
  coach     text    not null,
  duration  text    not null default '60 min',
  capacity  int     not null default 16,
  wod       text    default '',
  created_at timestamptz default now()
);

alter table public.classes enable row level security;

drop policy if exists "Authenticated can view classes"   on public.classes;
drop policy if exists "Admins can manage classes"        on public.classes;

create policy "Authenticated can view classes"
  on public.classes for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage classes"
  on public.classes for all
  using (public.is_admin())
  with check (public.is_admin());


-- 2. Tabla reservas
create table if not exists public.bookings (
  id          uuid    primary key default gen_random_uuid(),
  class_id    uuid    references public.classes on delete cascade not null,
  athlete_id  uuid    references public.profiles on delete cascade not null,
  status      text    not null default 'confirmed'
              check (status in ('confirmed', 'cancelled', 'waitlist')),
  created_at  timestamptz default now(),
  unique(class_id, athlete_id)
);

alter table public.bookings enable row level security;

drop policy if exists "Authenticated can view bookings"    on public.bookings;
drop policy if exists "Athletes can insert own bookings"   on public.bookings;
drop policy if exists "Athletes can delete own bookings"   on public.bookings;
drop policy if exists "Athletes can update own bookings"   on public.bookings;
drop policy if exists "Admins can manage all bookings"     on public.bookings;

create policy "Authenticated can view bookings"
  on public.bookings for select
  using (auth.role() = 'authenticated');

create policy "Athletes can insert own bookings"
  on public.bookings for insert
  with check (auth.uid() = athlete_id);

create policy "Athletes can update own bookings"
  on public.bookings for update
  using (auth.uid() = athlete_id);

create policy "Athletes can delete own bookings"
  on public.bookings for delete
  using (auth.uid() = athlete_id);

create policy "Admins can manage all bookings"
  on public.bookings for all
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================
-- SEED: 5 clases de hoy
-- ============================================================

insert into public.classes (id, name, date, time, coach, duration, capacity, wod) values
  ('00000000-0000-0000-0001-000000000001', 'WOD CrossFit',   current_date, '07:00', 'Sara Martínez', '60 min', 16,
   '3 rounds:
10 Pull-ups
15 Push-ups
20 Air Squats
Por tiempo — cap 20 min'),
  ('00000000-0000-0000-0001-000000000002', 'Open Box',       current_date, '10:00', 'Libre',          '60 min', 20,
   'Todo el material disponible. Entrena a tu ritmo.'),
  ('00000000-0000-0000-0001-000000000003', 'Halterofilia',   current_date, '12:00', 'Marcos Díaz',   '75 min', 16,
   'Snatch + Clean & Jerk
Técnica + levantamientos máximos'),
  ('00000000-0000-0000-0001-000000000004', 'WOD CrossFit',   current_date, '18:00', 'Sara Martínez', '60 min', 16,
   'AMRAP 20 min:
5 Deadlifts @ 100kg
10 Box Jumps
15 KB Swings @ 24kg'),
  ('00000000-0000-0000-0001-000000000005', 'Endurance',      current_date, '19:30', 'Marcos Díaz',   '60 min', 12,
   '4x800m @ ritmo 5K
2 min descanso entre series')
on conflict (id) do nothing;


-- ============================================================
-- SEED: Reservas de los usuarios demo
-- (ejecuta tras crear los usuarios en Authentication)
-- ============================================================

-- Carlos → WOD 07:00 (reservada)
insert into public.bookings (class_id, athlete_id, status)
select '00000000-0000-0000-0001-000000000001', p.id, 'confirmed'
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'carlos@wodbox.com'
on conflict (class_id, athlete_id) do nothing;

-- Carlos → WOD 18:00
insert into public.bookings (class_id, athlete_id, status)
select '00000000-0000-0000-0001-000000000004', p.id, 'confirmed'
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'carlos@wodbox.com'
on conflict (class_id, athlete_id) do nothing;

-- Ana → WOD 07:00
insert into public.bookings (class_id, athlete_id, status)
select '00000000-0000-0000-0001-000000000001', p.id, 'confirmed'
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'ana@wodbox.com'
on conflict (class_id, athlete_id) do nothing;

-- Ana → Endurance 19:30
insert into public.bookings (class_id, athlete_id, status)
select '00000000-0000-0000-0001-000000000005', p.id, 'confirmed'
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'ana@wodbox.com'
on conflict (class_id, athlete_id) do nothing;

-- Sara → Halterofilia 12:00
insert into public.bookings (class_id, athlete_id, status)
select '00000000-0000-0000-0001-000000000003', p.id, 'confirmed'
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'sara@wodbox.com'
on conflict (class_id, athlete_id) do nothing;
