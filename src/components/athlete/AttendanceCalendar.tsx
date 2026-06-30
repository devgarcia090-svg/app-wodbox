import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, withAlpha } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

export interface BookedDay {
  date: string;
  time: string;
  name: string;
}

interface Props {
  bookedDays: BookedDay[];
  primaryColor: string;
}

const DAY_HDR = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

function pad(n: number) { return String(n).padStart(2, '0'); }

export function AttendanceCalendar({ bookedDays, primaryColor }: Props) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();

  const todayStr = `${year}-${pad(month + 1)}-${pad(today.getDate())}`;
  const bookMap  = new Map<string, BookedDay>(bookedDays.map(b => [b.date, b]));

  const firstDow    = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstDow - daysInMonth).fill(null),
  ];

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
      <View style={styles.row}>
        {DAY_HDR.map(h => (
          <View key={h} style={styles.hdrCell}>
            <Text style={styles.hdrText}>{h}</Text>
          </View>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (!day) return <View key={`e${wi}-${di}`} style={styles.cell} />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const booked  = bookMap.get(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <View
                key={dateStr}
                style={[
                  styles.cell,
                  booked && { backgroundColor: withAlpha(primaryColor, 0.16), borderColor: withAlpha(primaryColor, 0.33), borderWidth: 1 },
                  isToday && styles.cellToday,
                ]}
              >
                <Text style={[styles.dayNum, booked && { color: primaryColor }, isToday && styles.dayToday]}>
                  {day}
                </Text>
                {booked && <Text style={[styles.timeText, { color: primaryColor }]}>{booked.time}</Text>}
                {booked && <Text style={styles.calIcon}>📅</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  monthTitle: {
    fontFamily: Fonts.bodySemiBold, fontSize: 14,
    color: Colors.white, marginBottom: 12,
  },
  row: { flexDirection: 'row', marginBottom: 2 },
  hdrCell: { flex: 1, alignItems: 'center', paddingBottom: 6 },
  hdrText: {
    fontSize: 10, color: Colors.muted,
    fontFamily: Fonts.bodySemiBold, letterSpacing: 0.5,
  },
  cell: {
    flex: 1, minHeight: 52,
    alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 5, borderRadius: 6, margin: 1,
    borderWidth: 0, borderColor: 'transparent',
  },
  cellToday: { borderWidth: 1.5, borderColor: Colors.yellow },
  dayNum: { fontSize: 12, color: Colors.white, fontFamily: Fonts.bodySemiBold },
  dayToday: { color: Colors.yellow },
  timeText: { fontSize: 9, fontFamily: Fonts.bodySemiBold, marginTop: 2 },
  calIcon: { fontSize: 9, marginTop: 1 },
});
