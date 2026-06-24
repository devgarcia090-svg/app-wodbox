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
      .select('id, member_id, number, date, plan_name, amount, paid, profiles(name)')
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
    })));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  return { invoices, loading, refetch: fetchInvoices };
}
