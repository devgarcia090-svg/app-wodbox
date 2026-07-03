import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface InvoiceRow {
  id: string;
  member_id: string | null;
  member_name: string;
  number: string;
  date: string;
  plan_name: string;
  amount: number;
  paid: boolean;
  payment_method: 'efectivo' | 'tarjeta' | null;
}

export function useInvoices(memberId?: string | null) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (memberId === null) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let q = supabase
      .from('invoices')
      .select('id, member_id, number, date, plan_name, amount, paid, payment_method, profiles(name)')
      .order('date', { ascending: false });

    if (memberId !== undefined) {
      q = q.eq('member_id', memberId);
    }

    const { data } = await q;

    setInvoices((data || []).map((r: any) => ({
      id: r.id,
      member_id: r.member_id,
      member_name: r.profiles?.name ?? '—',
      number: r.number,
      date: r.date,
      plan_name: r.plan_name,
      amount: r.amount,
      paid: r.paid,
      payment_method: r.payment_method ?? null,
    })));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const markAsPaid = async (id: string) => {
    const { error } = await supabase.from('invoices').update({ paid: true }).eq('id', id);
    if (!error) await fetchInvoices();
    return { error };
  };

  const createInvoice = async (data: {
    member_id: string;
    plan_name: string;
    amount: number;
    date: string;
    payment_method: 'efectivo' | 'tarjeta';
  }) => {
    // Numeración atómica generada en servidor (ver database/invoice_numbering.sql):
    // evita colisiones si dos admins crean factura a la vez o si se borra una factura.
    const { error } = await supabase.rpc('create_invoice', {
      p_member_id: data.member_id,
      p_plan_name: data.plan_name,
      p_amount: data.amount,
      p_date: data.date,
      p_payment_method: data.payment_method,
    });
    if (!error) await fetchInvoices();
    return { error };
  };

  return { invoices, loading, refetch: fetchInvoices, markAsPaid, createInvoice };
}
