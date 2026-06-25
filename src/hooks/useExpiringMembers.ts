import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ExpiringMember {
  id: string;
  name: string;
  avatar_initials: string;
  avatar_color: string;
  plan: string;
  membership_expires: string | null;
  classes_remaining: number | null;
  reason: 'expired' | 'expiring_soon' | 'no_classes';
}

export function useExpiringMembers() {
  const [members, setMembers] = useState<ExpiringMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const in7days = new Date(today);
    in7days.setDate(today.getDate() + 7);
    const in7Iso = in7days.toISOString().slice(0, 10);

    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_initials, avatar_color, plan, membership_expires, classes_remaining, membership_status')
      .eq('role', 'athlete');

    const result: ExpiringMember[] = [];
    for (const r of (data || []) as any[]) {
      const exp = r.membership_expires;
      if (exp && exp < todayIso) {
        result.push({ ...r, reason: 'expired' });
      } else if (exp && exp >= todayIso && exp <= in7Iso) {
        result.push({ ...r, reason: 'expiring_soon' });
      } else if (r.classes_remaining === 0) {
        result.push({ ...r, reason: 'no_classes' });
      }
    }

    // expired first, then expiring soon, then no_classes
    result.sort((a, b) => {
      const order = { expired: 0, expiring_soon: 1, no_classes: 2 };
      return order[a.reason] - order[b.reason];
    });

    setMembers(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { members, loading, refetch: fetch };
}
