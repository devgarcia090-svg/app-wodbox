export type ClassStatus = 'reserved' | 'full' | 'open';

export interface Attendee {
  name: string;
  initials: string;
  color: string;
  url?: string | null;
}

export interface ClassItem {
  id: string;
  name: string;
  date: string;
  time: string;
  coach: string;
  duration: string;
  enrolled: number;
  capacity: number;
  status: ClassStatus;
  wod: string;
  avatars: { initial: string; color: string; url?: string | null }[];
  attendees: Attendee[];
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWeekDays() {
  const today = new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  // 3 past days + today + 10 future days = 14 pills (TODAY_IDX = 3)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return { day: dayNames[d.getDay()], num: String(d.getDate()), isoDate: isoDate(d) };
  });
}

export const TODAY_ISO = isoDate(new Date());
export const DATE_PILLS = buildWeekDays();
export const TODAY_IDX = DATE_PILLS.findIndex(d => d.isoDate === TODAY_ISO);

