-- Control atómico de reservas: aforo real, bono/membresía y registro de bajas.
-- Pega en: Supabase → SQL Editor → New query → Run query
--
-- Motivo: hasta ahora el cliente insertaba directamente en `bookings` sin
-- ninguna comprobación en servidor. Dos atletas podían reservar la última
-- plaza a la vez (overbooking) y un atleta con el bono agotado o la
-- membresía caducada podía seguir reservando sin límite. Además, cancelar
-- borraba la fila entera y no quedaba ningún rastro de quién se había dado
-- de baja.

-- 1. Registrar cuándo se cancela una reserva
alter table public.bookings
  add column if not exists cancelled_at timestamptz;

-- 2. Las mutaciones de bookings pasan a hacerse solo a través de las
--    funciones de abajo (SECURITY DEFINER). Se retiran los permisos
--    directos de insert/update/delete del atleta para que no pueda saltarse
--    la validación de aforo y bono llamando directamente a la API REST.
drop policy if exists "Athletes can insert own bookings" on public.bookings;
drop policy if exists "Athletes can update own bookings" on public.bookings;
drop policy if exists "Athletes can delete own bookings" on public.bookings;

-- 3. Reservar plaza (o apuntarse a lista de espera si está completa)
create or replace function public.book_class(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_athlete   uuid := auth.uid();
  v_profile   public.profiles;
  v_class     public.classes;
  v_enrolled  int;
  v_consumed  int;
  v_period_end date;
begin
  if v_athlete is null then
    return jsonb_build_object('status', 'error', 'message', 'No autenticado.');
  end if;

  -- Bloquea la fila de la clase: serializa reservas concurrentes de la
  -- misma clase para que el recuento de aforo sea siempre correcto.
  select * into v_class from public.classes where id = p_class_id for update;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'La clase ya no existe.');
  end if;

  select * into v_profile from public.profiles where id = v_athlete;
  if not found then
    return jsonb_build_object('status', 'error', 'message', 'Perfil no encontrado.');
  end if;

  if v_profile.membership_status <> 'active' then
    return jsonb_build_object('status', 'error', 'message', 'Tu membresía no está activa.');
  end if;

  if v_profile.plan_classes is not null and v_profile.membership_start is not null then
    v_period_end := v_profile.membership_start + interval '1 month';
    if current_date > v_period_end then
      return jsonb_build_object('status', 'error', 'message', 'Tu bono ha caducado.');
    end if;

    select count(*) into v_consumed
      from public.bookings b
      join public.classes c on c.id = b.class_id
      where b.athlete_id = v_athlete
        and b.status = 'confirmed'
        and c.date >= v_profile.membership_start
        and c.date <= current_date;

    if v_consumed >= v_profile.plan_classes then
      return jsonb_build_object('status', 'error', 'message', 'No te quedan clases en tu bono este mes.');
    end if;
  end if;

  select count(*) into v_enrolled
    from public.bookings
    where class_id = p_class_id and status = 'confirmed';

  if v_enrolled >= v_class.capacity then
    insert into public.bookings (class_id, athlete_id, status, cancelled_at)
    values (p_class_id, v_athlete, 'waitlist', null)
    on conflict (class_id, athlete_id) do update set status = 'waitlist', cancelled_at = null;
    return jsonb_build_object('status', 'waitlist', 'message', 'Clase completa. Solicitud enviada al entrenador.');
  end if;

  insert into public.bookings (class_id, athlete_id, status, cancelled_at)
  values (p_class_id, v_athlete, 'confirmed', null)
  on conflict (class_id, athlete_id) do update set status = 'confirmed', cancelled_at = null;

  return jsonb_build_object('status', 'confirmed', 'message', '✅ Plaza reservada.');
end;
$$;

grant execute on function public.book_class(uuid) to authenticated;

-- 4. Cancelar reserva (o retirar solicitud de lista de espera). Marca la
--    fila como cancelada en vez de borrarla, para que quede constancia de
--    quién se ha dado de baja.
create or replace function public.cancel_booking(p_class_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_athlete uuid := auth.uid();
  v_updated int;
begin
  if v_athlete is null then
    return jsonb_build_object('status', 'error', 'message', 'No autenticado.');
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now()
  where class_id = p_class_id
    and athlete_id = v_athlete
    and status in ('confirmed', 'waitlist');

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('status', 'error', 'message', 'No tenías ninguna reserva activa en esta clase.');
  end if;

  return jsonb_build_object('status', 'cancelled', 'message', 'Reserva cancelada.');
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;
