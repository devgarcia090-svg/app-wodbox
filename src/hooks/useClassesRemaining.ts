import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Mirrors the calculation in ProfileScreen: remaining = plan_classes − confirmed
// bookings whose class date falls within the current membership period.
export function useClassesRemaining() {
  const { session, profile } = useAuth();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!session?.user.id || profile?.plan_classes == null || !profile?.membership_start) {
      setRemaining(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const now = new Date();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    const { data, error } = await supabase
      .from('bookings')
      .select('id, classes!bookings_class_id_fkey(date)')
      .eq('athlete_id', session.user.id)
      .eq('status', 'confirmed');

    if (error) {
      setRemaining(null);
      setLoading(false);
      return;
    }

    const consumed = ((data ?? []) as any[]).filter(
      b => b.classes && b.classes.date >= profile.membership_start! && b.classes.date <= todayStr
    ).length;

    setRemaining(Math.max(0, profile.plan_classes! - consumed));
    setLoading(false);
  }, [session?.user.id, profile?.plan_classes, profile?.membership_start]);

  useEffect(() => { refetch(); }, [refetch]);

  return { remaining, loading, refetch };
}
