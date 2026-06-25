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
    await supabase.from('invoices').update({ paid: true }).eq('id', id);
    await fetchInvoices();
  };

  const createInvoice = async (data: {
    member_id: string;
    plan_name: string;
    amount: number;
    date: string;
    payment_method: 'efectivo' | 'tarjeta';
  }) => {
    // Generate correlative number: F-YYYYMM-XXX
    const { count } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true });
    const n = String((count ?? 0) + 1).padStart(3, '0');
    const ym = data.date.slice(0, 7).replace('-', '');
    const number = `F-${ym}-${n}`;

    const { error } = await supabase.from('invoices').insert({
      member_id: data.member_id,
      plan_name: data.plan_name,
      amount: data.amount,
      date: data.date,
      paid: false,
      number,
      payment_method: data.payment_method,
    });
    if (!error) await fetchInvoices();
    return { error };
  };

  return { invoices, loading, refetch: fetchInvoices, markAsPaid, createInvoice };
}
