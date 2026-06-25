import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { ClassItem, ClassStatus } from '../data/mockData';

interface RawBooking {
  id: string;
  athlete_id: string;
  status: string;
  profiles: { name: string; avatar_initials: string; avatar_color: string; avatar_url: string | null } | null;
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

export function useClasses(date: string) {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { data } = await supabase
      .from('classes')
      .select(`
        id, name, date, time, coach, duration, capacity, wod,
        bookings(
          id, athlete_id, status,
          profiles(name, avatar_initials, avatar_color, avatar_url)
        )
      `)
      .eq('date', date)
      .order('time');

    if (!data) {
      setLoading(false);
      return;
    }

    const userId = session.user.id;
    const formatted: ClassItem[] = (data as unknown as RawClass[]).map(cls => {
      const confirmed = (cls.bookings || []).filter(b => b.status === 'confirmed');
      const enrolled = confirmed.length;
      const isReserved = confirmed.some(b => b.athlete_id === userId);

      let status: ClassStatus;
      if (isReserved) status = 'reserved';
      else if (enrolled >= cls.capacity) status = 'full';
      else status = 'open';

      const attendees = confirmed
        .filter(b => b.profiles)
        .map(b => ({
          name: b.profiles!.name,
          initials: b.profiles!.avatar_initials || b.profiles!.name.slice(0, 2).toUpperCase(),
          color: b.profiles!.avatar_color || '#f95c00',
          url: b.profiles!.avatar_url || null,
        }));

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
