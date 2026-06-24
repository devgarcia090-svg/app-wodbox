import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type DayType = { num: number; type: 'current' | 'other'; today?: boolean; reserved?: boolean; hasClass?: boolean };

const CALENDAR_DAYS: DayType[] = [
  { num: 26, type: 'other' }, { num: 27, type: 'other' }, { num: 28, type: 'other' },
  { num: 29, type: 'other' }, { num: 30, type: 'other' }, { num: 31, type: 'other' }, { num: 1, type: 'current' },
  { num: 2, type: 'current', hasClass: true }, { num: 3, type: 'current', hasClass: true },
  { num: 4, type: 'current', hasClass: true }, { num: 5, type: 'current', hasClass: true },
  { num: 6, type: 'current', hasClass: true }, { num: 7, type: 'current' }, { num: 8, type: 'current' },
  { num: 9, type: 'current', reserved: true, hasClass: true }, { num: 10, type: 'current', hasClass: true },
  { num: 11, type: 'current', reserved: true, hasClass: true }, { num: 12, type: 'current', hasClass: true },
  { num: 13, type: 'current', reserved: true, hasClass: true }, { num: 14, type: 'current' }, { num: 15, type: 'current' },
  { num: 16, type: 'current', hasClass: true }, { num: 17, type: 'current', reserved: true, hasClass: true },
  { num: 18, type: 'current', hasClass: true }, { num: 19, type: 'current', reserved: true, hasClass: true },
  { num: 20, type: 'current', hasClass: true }, { num: 21, type: 'current' }, { num: 22, type: 'current' },
  { num: 23, type: 'current', reserved: true, hasClass: true }, { num: 24, type: 'current', today: true, hasClass: true },
  { num: 25, type: 'current', hasClass: true }, { num: 26, type: 'current', hasClass: true },
  { num: 27, type: 'current', hasClass: true }, { num: 28, type: 'current' }, { num: 29, type: 'current' },
  { num: 30, type: 'current', hasClass: true },
  { num: 1, type: 'other' }, { num: 2, type: 'other' }, { num: 3, type: 'other' },
  { num: 4, type: 'other' }, { num: 5, type: 'other' }, { num: 6, type: 'other' },
];

const WEEK_TIMES = ['07:00', '10:00', '12:00', '18:00', '19:30'];
const WEEK_COLS = [
  { label: 'L 22', today: false },
  { label: 'M 23', today: false },
  { label: 'X 24', today: true },
  { label: 'J 25', today: false },
  { label: 'V 26', today: false },
];

type SlotData = { name: string; coach: string; status: 'reserved' | 'full' | 'empty' | 'open' };

const WEEK_DATA: SlotData[][] = [
  [
    { name: 'WOD', coach: 'Sara', status: 'reserved' },
    { name: 'WOD', coach: 'Sara', status: 'open' },
    { name: 'WOD', coach: 'Sara', status: 'reserved' },
    { name: 'WOD', coach: 'Sara', status: 'open' },
    { name: 'WOD', coach: 'Sara', status: 'open' },
  ],
  [
    { name: '', coach: '', status: 'empty' },
    { name: '', coach: '', status: 'empty' },
    { name: 'Open', coach: 'Libre', status: 'open' },
    { name: '', coach: '', status: 'empty' },
    { name: 'Open', coach: 'Libre', status: 'open' },
  ],
  [
    { name: 'Halterofilia', coach: 'Marcos', status: 'full' },
    { name: '', coach: '', status: 'empty' },
    { name: 'Halterofilia', coach: 'Marcos', status: 'full' },
    { name: '', coach: '', status: 'empty' },
    { name: '', coach: '', status: 'empty' },
  ],
  [
    { name: 'WOD', coach: 'Sara', status: 'reserved' },
    { name: 'WOD', coach: 'Sara', status: 'reserved' },
    { name: 'WOD', coach: 'Sara', status: 'open' },
    { name: 'WOD', coach: 'Sara', status: 'open' },
    { name: 'WOD', coach: 'Sara', status: 'reserved' },
  ],
  [
    { name: '', coach: '', status: 'empty' },
    { name: 'Endurance', coach: 'Marcos', status: 'open' },
    { name: 'Endurance', coach: 'Marcos', status: 'open' },
    { name: 'Endurance', coach: 'Marcos', status: 'open' },
    { name: '', coach: '', status: 'empty' },
  ],
];

export function CalendarScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Month header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Junio 2026</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.navBtn}><Text style={styles.navBtnText}>‹</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navBtn}><Text style={styles.navBtnText}>›</Text></TouchableOpacity>
        </View>
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {DAY_HEADERS.map(d => (
          <View key={d} style={styles.calDayHeader}>
            <Text style={styles.calDayHeaderText}>{d}</Text>
          </View>
        ))}
        {CALENDAR_DAYS.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.calDay,
              d.today && styles.calDayToday,
              d.reserved && !d.today && styles.calDayReserved,
            ]}
          >
            <Text style={[
              styles.calDayText,
              d.type === 'other' && styles.calDayOther,
              d.today && styles.calDayTodayText,
              d.reserved && !d.today && styles.calDayReservedText,
            ]}>
              {d.num}
            </Text>
            {d.hasClass && (
              <View style={[styles.calDot, d.today && styles.calDotToday]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.orange }]} />
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
            {WEEK_COLS.map((col, i) => (
              <View key={i} style={styles.weekColHeader}>
                <Text style={[styles.weekColHeaderText, col.today && styles.weekColHeaderToday]}>{col.label}</Text>
              </View>
            ))}
          </View>

          {WEEK_TIMES.map((time, rowIdx) => (
            <View key={rowIdx} style={styles.weekRow}>
              <View style={styles.weekTimeCell}>
                <Text style={styles.weekTimeText}>{time}</Text>
              </View>
              {WEEK_DATA[rowIdx].map((slot, colIdx) => (
                <TouchableOpacity
                  key={colIdx}
                  style={[
                    styles.weekSlot,
                    slot.status === 'reserved' && styles.weekSlotReserved,
                    slot.status === 'full' && styles.weekSlotFull,
                    slot.status === 'empty' && styles.weekSlotEmpty,
                  ]}
                  disabled={slot.status === 'empty'}
                >
                  {slot.status !== 'empty' && (
                    <>
                      <Text style={styles.weekSlotName}>{slot.name}</Text>
                      <Text style={styles.weekSlotCoach}>{slot.coach}</Text>
                    </>
                  )}
                </TouchableOpacity>
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
  calDayToday: { backgroundColor: Colors.orange },
  calDayReserved: {},
  calDayText: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    color: Colors.white,
  },
  calDayOther: { color: Colors.surface3 },
  calDayTodayText: { color: '#fff', fontFamily: Fonts.bodySemiBold },
  calDayReservedText: { color: Colors.green },
  calDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.orange,
  },
  calDotToday: { backgroundColor: '#fff' },
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
  weekColHeaderToday: { color: Colors.orange },
  weekRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  weekTimeText: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  weekSlot: {
    width: 80,
    minHeight: 36,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 4,
    paddingHorizontal: 6,
  },
  weekSlotReserved: { backgroundColor: Colors.orangeGlow, borderColor: Colors.orange },
  weekSlotFull: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' },
  weekSlotEmpty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  weekSlotName: { fontSize: 10, fontFamily: Fonts.bodySemiBold, color: Colors.white },
  weekSlotCoach: { fontSize: 9, color: Colors.muted, fontFamily: Fonts.body },
});
