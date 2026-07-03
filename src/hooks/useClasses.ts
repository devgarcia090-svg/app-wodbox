import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { ClassItem, ClassStatus } from '../data/mockData';

interface RawBooking {
  id: string;
  athlete_id: string;
  status: string;
  cancelled_at: string | null;
}

interface RawClass {
  id: string;
  name: string;
  date: string;
  time: string;
  coach: string;
  duration: string;
  capacity: number;
  wod: string;
  bookings: RawBooking[];
}

interface PublicProfile {
  id: string;
  name: string;
  avatar_initials: string | null;
  avatar_color: string | null;
  avatar_url: string | null;
}

export function useClasses(date: string) {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('classes')
      .select(`
        id, name, date, time, coach, duration, capacity, wod,
        bookings(id, athlete_id, status, cancelled_at)
      `)
      .eq('date', date)
      .order('time');

    if (error || !data) {
      setClasses([]);
      setLoading(false);
      return;
    }

    // RLS on `profiles` only allows reading your own row (or any row if
    // you're admin), so the embedded `bookings(profiles(...))` join used
    // to come back null for every athlete but yourself. Fetch names/avatars
    // separately through a function that exposes just those safe columns.
    const athleteIds = [...new Set(
      (data as unknown as RawClass[]).flatMap(c => (c.bookings || []).map(b => b.athlete_id))
    )];
    const { data: profilesData } = athleteIds.length
      ? await supabase.rpc('public_profiles', { p_ids: athleteIds })
      : { data: [] as PublicProfile[] };
    const profileMap = new Map<string, PublicProfile>(
      (profilesData ?? []).map((p: PublicProfile) => [p.id, p])
    );

    const userId = session.user.id;
    const toAttendee = (b: RawBooking) => {
      const p = profileMap.get(b.athlete_id);
      return {
        bookingId: b.id,
        athleteId: b.athlete_id,
        name: p?.name ?? '—',
        initials: p?.avatar_initials || p?.name.slice(0, 2).toUpperCase() || '?',
        color: p?.avatar_color || '#f95c00',
        url: p?.avatar_url || null,
      };
    };

    const formatted: ClassItem[] = (data as unknown as RawClass[]).map(cls => {
      const confirmed = (cls.bookings || []).filter(b => b.status === 'confirmed');
      const waitlisted = (cls.bookings || []).filter(b => b.status === 'waitlist');
      const cancelledRows = (cls.bookings || [])
        .filter(b => b.status === 'cancelled')
        .sort((a, b) => (b.cancelled_at ?? '').localeCompare(a.cancelled_at ?? ''));
      const enrolled = confirmed.length;
      const isReserved = confirmed.some(b => b.athlete_id === userId);
      const isWaitlisted = waitlisted.some(b => b.athlete_id === userId);

      let status: ClassStatus;
      if (isReserved) status = 'reserved';
      else if (isWaitlisted) status = 'waitlist';
      else if (enrolled >= cls.capacity) status = 'full';
      else status = 'open';

      const attendees = confirmed.map(toAttendee);
      const waitlist = waitlisted.map(toAttendee);
      const cancelled = cancelledRows.map(b => {
        const p = profileMap.get(b.athlete_id);
        return {
          bookingId: b.id,
          name: p?.name ?? '—',
          initials: p?.avatar_initials || p?.name.slice(0, 2).toUpperCase() || '?',
          color: p?.avatar_color || '#f95c00',
          cancelledAt: b.cancelled_at,
        };
      });

      return {
        id: cls.id,
        name: cls.name,
        date: cls.date,
        time: cls.time,
        coach: cls.coach,
        duration: cls.duration,
        enrolled,
        capacity: cls.capacity,
        status,
        wod: cls.wod || '',
        avatars: attendees.slice(0, 3).map(a => ({ initial: a.initials[0] || '?', color: a.color, url: a.url })),
        attendees,
        waitlist,
        cancelled,
      };
    });

    setClasses(formatted);
    setLoading(false);
  }, [date, session]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, refetch: fetchClasses };
}
