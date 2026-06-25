import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MemberRow {
  id: string;
  name: string;
  email?: string;
  avatar_initials: string;
  avatar_color: string;
  plan: string;
  membership_status: 'active' | 'pending' | 'inactive';
  membership_expires: string | null;
  classes_remaining: number | null;
  isPendingInvite: boolean;
}

export function useMembers() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);

    const [profilesRes, invitesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, avatar_initials, avatar_color, plan, membership_status, membership_expires, classes_remaining')
        .eq('role', 'athlete')
        .order('name'),
      supabase
        .from('pending_invites')
        .select('id, email, name, plan, invited_at')
        .order('invited_at', { ascending: false }),
    ]);

    const profiles: MemberRow[] = (profilesRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      avatar_initials: r.avatar_initials || (r.name || 'U').slice(0, 2).toUpperCase(),
      avatar_color: r.avatar_color || '#f95c00',
      plan: r.plan || 'Sin plan',
      membership_status: r.membership_status || 'inactive',
      membership_expires: r.membership_expires ?? null,
      classes_remaining: r.classes_remaining ?? null,
      isPendingInvite: false,
    }));

    const invites: MemberRow[] = (invitesRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      avatar_initials: (r.name || 'P').slice(0, 2).toUpperCase(),
      avatar_color: '#6b7280',
      plan: r.plan || 'Sin plan',
      membership_status: 'pending' as const,
      membership_expires: null,
      classes_remaining: null,
      isPendingInvite: true,
    }));

    setMembers([...profiles, ...invites]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  return { members, loading, refetch: fetchMembers };
}
