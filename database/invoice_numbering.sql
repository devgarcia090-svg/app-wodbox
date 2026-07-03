-- Numeración de facturas atómica y sin colisiones.
-- Motivo: el número se generaba en el cliente como `count(*) + 1`. Dos
-- admins creando factura a la vez (o cualquier borrado posterior de una
-- factura) podían producir el mismo número F-YYYYMM-XXX, violando el
-- unique constraint o, peor, generando dos facturas con el mismo número
-- antes de que la constraint lo detectara.
-- Pega en: Supabase → SQL Editor → New query → Run query

create table if not exists public.invoice_counters (
  ym      text primary key,
  next_n  int  not null default 1
);

alter table public.invoice_counters enable row level security;
-- Sin policies: solo la función de abajo (SECURITY DEFINER) toca esta tabla.

create or replace function public.create_invoice(
  p_member_id       uuid,
  p_plan_name       text,
  p_amount          numeric,
  p_date            date,
  p_payment_method  text
)
returns public.invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ym      text := to_char(p_date, 'YYYYMM');
  v_n       int;
  v_number  text;
  v_invoice public.invoices;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede crear facturas.';
  end if;

  -- Upsert atómico: el UNIQUE constraint de invoice_counters serializa las
  -- llamadas concurrentes del mismo mes, así que nunca se reparte el mismo
  -- número dos veces.
  insert into public.invoice_counters (ym, next_n)
  values (v_ym, 2)
  on conflict (ym) do update set next_n = public.invoice_counters.next_n + 1
  returning next_n - 1 into v_n;

  v_number := 'F-' || v_ym || '-' || lpad(v_n::text, 3, '0');

  insert into public.invoices (member_id, plan_name, amount, date, paid, number, payment_method)
  values (p_member_id, p_plan_name, p_amount, p_date, false, v_number, p_payment_method)
  returning * into v_invoice;

  return v_invoice;
end;
$$;

grant execute on function public.create_invoice(uuid, text, numeric, date, text) to authenticated;
