import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export interface DatePill {
  day: string;
  num: string;
  isoDate: string;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWeekDays(): DatePill[] {
  const today = new Date();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  // 3 past days + today + 10 future days = 14 pills (todayIdx = 3)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return { day: dayNames[d.getDay()], num: String(d.getDate()), isoDate: isoDate(d) };
  });
}

function computeToday() {
  const todayIso = isoDate(new Date());
  const datePills = buildWeekDays();
  const todayIdx = datePills.findIndex(d => d.isoDate === todayIso);
  return { todayIso, datePills, todayIdx };
}

// mockData used to export TODAY_ISO/DATE_PILLS/TODAY_IDX as plain module
// constants computed once at import time. If the app stayed open (or just
// backgrounded) past midnight, "hoy" kept pointing at the previous day:
// wrong date pills, wrong "Clases de hoy" section, and invoices created
// from the admin panel got yesterday's date. Recomputing whenever the app
// comes back to the foreground keeps it correct without polling.
export function useTodayPills() {
  const [state, setState] = useState(computeToday);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setState(computeToday());
    });
    return () => sub.remove();
  }, []);

  return state;
}
