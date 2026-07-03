-- Dispara la función send-push directamente desde la base de datos, sin
-- pasar por la pantalla "Database → Webhooks" del Dashboard (en algunas
-- versiones de la interfaz esa pantalla no aparece / se ha movido).
-- Usa la extensión pg_net, que Supabase activa por defecto en todos los
-- proyectos.
--
-- IMPORTANTE: sustituye <TU_WEBHOOK_SECRET> por el mismo valor que
-- pusiste con `supabase secrets set WEBHOOK_SECRET=...`, antes de ejecutar.
-- Pega en: Supabase → SQL Editor → New query → Run query

create extension if not exists pg_net;

create or replace function public.notify_send_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://rqcqdcfptwghqwpvbhss.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<TU_WEBHOOK_SECRET>'
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    )
  );
  return NEW;
end;
$$;

drop trigger if exists on_message_insert_notify on public.messages;
create trigger on_message_insert_notify
  after insert on public.messages
  for each row execute procedure public.notify_send_push();

drop trigger if exists on_booking_change_notify on public.bookings;
create trigger on_booking_change_notify
  after insert or update on public.bookings
  for each row execute procedure public.notify_send_push();
