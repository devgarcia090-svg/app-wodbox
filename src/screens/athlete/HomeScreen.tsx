import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { withAlpha } from '../../theme/colors';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ClassCard } from '../../components/athlete/ClassCard';
import { ClassModal } from '../../components/athlete/ClassModal';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { useClasses } from '../../hooks/useClasses';
import { useClassesRemaining } from '../../hooks/useClassesRemaining';
import { useTodayPills, type DatePill } from '../../hooks/useTodayPills';
import { useAuth } from '../../context/AuthContext';
import { useBoxConfig } from '../../context/BoxConfigContext';

const DAY_NAMES: Record<string, string> = {
  LUN: 'Lunes', MAR: 'Martes', 'MIÉ': 'Miércoles',
  JUE: 'Jueves', VIE: 'Viernes', 'SÁB': 'Sábado', DOM: 'Domingo',
};

function classesLabel(dateIdx: number, datePills: DatePill[], todayIdx: number): string {
  const d = datePills[dateIdx];
  if (!d) return 'Clases';
  if (dateIdx === todayIdx) return 'Clases de hoy';
  if (todayIdx >= 0 && dateIdx === todayIdx + 1) return 'Clases de mañana';
  return `${DAY_NAMES[d.day] ?? d.day} ${d.num}`;
}

function shortExpiry(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

export function HomeScreen() {
  const { profile } = useAuth();
  const boxConfig = useBoxConfig();
  const { datePills, todayIdx } = useTodayPills();
  const [activeDateIdx, setActiveDateIdx] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<import('../../data/mockData').ClassItem | null>(null);
  const { toast, showToast } = useToast();

  const selectedDate = datePills[activeDateIdx]?.isoDate ?? datePills[0].isoDate;
  const { classes, loading, refetch } = useClasses(selectedDate);
  const { remaining, refetch: refetchRemaining } = useClassesRemaining();
  const refreshAll = () => { refetch(); refetchRemaining(); };

  const timePills = ['Todas', ...[...new Set(classes.map(c => c.time))].sort()];
  const filteredClasses = selectedTime && selectedTime !== 'Todas'
    ? classes.filter(c => c.time === selectedTime)
    : classes;

  const today = datePills[todayIdx];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, <Text style={[styles.name, { color: boxConfig.primary_color }]}>{profile?.name ?? 'Atleta'}</Text> 💪</Text>
        <Text style={styles.sub}>
          {today ? `${today.day} ${today.num} · ` : ''}{boxConfig.name}
        </Text>
        {profile?.plan && (
          <View style={[styles.memberBadge, { backgroundColor: withAlpha(boxConfig.primary_color, 0.15), borderColor: boxConfig.primary_color }]}>
            <View style={[styles.memberDot, { backgroundColor: boxConfig.primary_color }]} />
            <Text style={[styles.memberText, { color: boxConfig.primary_color }]}>
              {profile.plan}
              {remaining != null ? ` · ${remaining} restantes` : ''}
              {profile.membership_expires ? ` — vence ${shortExpiry(profile.membership_expires)}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Date scroll */}
      <View style={styles.dateScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateContent}>
          {datePills.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.datePill, activeDateIdx === i && { backgroundColor: boxConfig.primary_color, borderColor: boxConfig.primary_color }]}
              onPress={() => { setActiveDateIdx(i); setSelectedTime(null); }}
            >
              <Text style={[styles.dateDay, activeDateIdx === i && styles.dateDayActive]}>{d.day}</Text>
              <Text style={[styles.dateNum, activeDateIdx === i && styles.dateNumActive]}>{d.num}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Time filter */}
      {!loading && classes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll} contentContainerStyle={styles.timeContent}>
          {timePills.map(t => {
            const active = t === 'Todas' ? !selectedTime || selectedTime === 'Todas' : selectedTime === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.timePill, active && { backgroundColor: boxConfig.primary_color, borderColor: boxConfig.primary_color }]}
                onPress={() => setSelectedTime(t)}
              >
                <Text style={[styles.timePillText, active && styles.timePillTextActive]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedTime && selectedTime !== 'Todas'
              ? `${classesLabel(activeDateIdx, datePills, todayIdx)} · ${selectedTime}`
              : classesLabel(activeDateIdx, datePills, todayIdx)}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={boxConfig.primary_color} style={{ marginTop: 40 }} />
        ) : filteredClasses.length === 0 ? (
          <Text style={styles.emptyText}>No hay clases para este día</Text>
        ) : (
          filteredClasses.map(item => (
            <ClassCard key={item.id} item={item} onPress={setSelectedClass} />
          ))
        )}
        <View style={{ height: 16 }} />
      </ScrollView>

      <ClassModal
        item={selectedClass}
        onClose={() => setSelectedClass(null)}
        onAction={(msg, type) => showToast(msg, type)}
        onRefresh={refreshAll}
      />
      <Toast {...toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  header: {
    backgroundColor: Colors.surface,
    padding: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.white,
    lineHeight: 30,
    marginBottom: 4,
  },
  name: { color: Colors.orange },
  sub: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.orangeGlow,
    borderWidth: 1,
    borderColor: Colors.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  memberDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.orange },
  memberText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.orange },
  dateScroll: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateContent: { paddingHorizontal: 20, paddingVertical: 16, gap: 8, flexDirection: 'row' },
  datePill: {
    alignItems: 'center',
    minWidth: 52,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  dateDay: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateDayActive: { color: 'rgba(255,255,255,0.8)' },
  dateNum: { fontFamily: Fonts.heading, fontSize: 20, color: Colors.white, lineHeight: 24 },
  dateNumActive: { color: '#fff' },
  timeScroll: {
    flexGrow: 0,
    backgroundColor: Colors.black,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  timeContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 8, flexDirection: 'row' },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  timePillText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.muted },
  timePillTextActive: { color: '#fff' },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.muted,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.muted,
    fontFamily: Fonts.body,
    fontSize: 14,
    marginTop: 40,
  },
});
