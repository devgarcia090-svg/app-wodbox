import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, withAlpha } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { useBoxConfig } from '../../context/BoxConfigContext';

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type DayType = { num: number; type: 'current' | 'other'; today?: boolean; iso: string };

function buildCalendarDays(year: number, month: number): DayType[] {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-first offset (0=Mon … 6=Sun)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days: DayType[] = [];

  // Days from previous month
  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const num = prevMonthLast - i;
    const d = new Date(year, month - 1, num);
    days.push({ num, type: 'other', iso: isoDate(d) });
  }

  // Days of current month
  for (let n = 1; n <= lastDay.getDate(); n++) {
    const d = new Date(year, month, n);
    const iso = isoDate(d);
    days.push({ num: n, type: 'current', today: iso === todayIso, iso });
  }

  // Fill to complete last row (7 cols)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const d = new Date(year, month + 1, n);
    days.push({ num: n, type: 'other', iso: isoDate(d) });
  }

  return days;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildWeekCols(year: number, month: number): { label: string; today: boolean }[] {
  const today = new Date();
  const todayIso = isoDate(today);

  // Find the first Monday of the given month
  const firstMonday = new Date(year, month, 1);
  firstMonday.setDate(1 + ((8 - firstMonday.getDay()) % 7 === 0 ? 0 : (8 - firstMonday.getDay()) % 7));
  if (firstMonday.getDay() !== 1) {
    // fallback: use Monday of current week
    firstMonday.setTime(today.getTime());
    firstMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  }

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(firstMonday);
    d.setDate(firstMonday.getDate() + i);
    const shortDay = ['L', 'M', 'X', 'J', 'V'][(d.getDay() + 6) % 7] ?? 'L';
    return { label: `${shortDay} ${d.getDate()}`, today: isoDate(d) === todayIso };
  });
}

const WEEK_TIMES = ['07:00', '10:00', '12:00', '18:00', '19:30'];

export function CalendarScreen() {
  const { primary_color } = useBoxConfig();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const calendarDays = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekCols = useMemo(() => buildWeekCols(viewYear, viewMonth), [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Month header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={goToNextMonth}>
            <Text style={styles.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {DAY_HEADERS.map(d => (
          <View key={d} style={styles.calDayHeader}>
            <Text style={styles.calDayHeaderText}>{d}</Text>
          </View>
        ))}
        {calendarDays.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.calDay,
              d.today && { backgroundColor: primary_color },
            ]}
          >
            <Text style={[
              styles.calDayText,
              d.type === 'other' && styles.calDayOther,
              d.today && styles.calDayTodayText,
            ]}>
              {d.num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: primary_color }]} />
          <Text style={styles.legendText}>Disponible</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.green }]} />
          <Text style={styles.legendText}>Reservada</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Weekly view */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vista semanal</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {/* Week headers */}
          <View style={styles.weekHeaderRow}>
            <View style={styles.weekTimeCell} />
            {weekCols.map((col, i) => (
              <View key={i} style={styles.weekColHeader}>
                <Text style={[styles.weekColHeaderText, col.today && { color: primary_color }]}>{col.label}</Text>
              </View>
            ))}
          </View>

          {WEEK_TIMES.map((time, rowIdx) => (
            <View key={rowIdx} style={styles.weekRow}>
              <View style={styles.weekTimeCell}>
                <Text style={styles.weekTimeText}>{time}</Text>
              </View>
              {weekCols.map((_, colIdx) => (
                <View key={colIdx} style={styles.weekSlotEmpty} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  row: { flexDirection: 'row', gap: 8 },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtnText: { color: Colors.white, fontSize: 14 },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 2,
  },
  calDayHeader: { width: '14.28%', alignItems: 'center', paddingVertical: 8 },
  calDayHeaderText: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  calDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calDayText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.white,
  },
  calDayOther: { color: Colors.surface3 },
  calDayTodayText: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  weekHeaderRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  weekTimeCell: { width: 52, alignItems: 'flex-end', paddingRight: 8, paddingTop: 4 },
  weekColHeader: { width: 80, alignItems: 'center', paddingVertical: 4 },
  weekColHeaderText: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.muted },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  weekTimeText: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  weekSlotEmpty: {
    width: 80,
    minHeight: 36,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
  },
});
