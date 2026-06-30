-- Tabla de resultados de WOD por atleta y clase
create table if not exists public.wod_results (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  result_text  text not null,
  rx           boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  constraint wod_results_unique unique (class_id, athlete_id)
);

alter table public.wod_results enable row level security;

-- Todos los atletas autenticados pueden ver los resultados (leaderboard público)
create policy "Authenticated can view results"
  on public.wod_results for select
  to authenticated
  using (true);

-- Cada atleta gestiona solo su propio resultado
create policy "Athletes can manage own result"
  on public.wod_results for all
  to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());
