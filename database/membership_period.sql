-- Añade fecha de inicio del periodo y total de clases del plan al perfil
-- El admin lo rellena al crear/renovar la membresía
alter table public.profiles
  add column if not exists membership_start date,
  add column if not exists plan_classes     int;
