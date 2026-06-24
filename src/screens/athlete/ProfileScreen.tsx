import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';

export function ProfileScreen() {
  const { toast, showToast } = useToast();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarText}>CM</Text>
          </View>
          <View>
            <Text style={styles.name}>Carlos Martínez</Text>
            <Text style={styles.box}>CrossFit Murcia</Text>
            <Text style={styles.since}>Atleta desde enero 2024</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>127</Text>
            <Text style={styles.statLabel}>Clases</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Este mes</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>94%</Text>
            <Text style={styles.statLabel}>Asistencia</Text>
          </View>
        </View>

        {/* Membership card */}
        <View style={styles.memberCard}>
          <Text style={styles.mcLabel}>Mi membresía</Text>
          <Text style={styles.mcPlan}>Ilimitado</Text>
          <Text style={styles.mcMeta}>CrossFit Murcia · 55€/mes</Text>
          <View style={styles.mcExpires}>
            <View>
              <Text style={styles.mcExpiresLabel}>Próxima renovación</Text>
              <Text style={styles.mcExpiresDate}>1 de agosto 2026</Text>
            </View>
            <Badge label="Activa" variant="orange" />
          </View>
        </View>

        {/* Recent activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actividad reciente</Text>
        </View>
        <ActivityRow
          color={Colors.green}
          name="WOD CrossFit · 07:00"
          date="Hoy, miércoles 24 jun"
          badge={<Badge label="Reservada" variant="orange" />}
        />
        <ActivityRow
          color={Colors.orange}
          name="WOD CrossFit · 18:00"
          date="Martes 23 jun"
          badge={<Badge label="Asistido" variant="green" />}
        />
        <ActivityRow
          color={Colors.orange}
          name="Halterofilia · 12:00"
          date="Lunes 22 jun"
          badge={<Badge label="Asistido" variant="green" />}
        />

        {/* Invoices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis facturas</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <InvoiceRow num="FAC-2026-006" date="1 jun 2026 · Membresía Ilimitado" amount="55,00€" />
          <InvoiceRow num="FAC-2026-005" date="1 may 2026 · Membresía Ilimitado" amount="55,00€" />
        </View>

        <View style={styles.settingsBtn}>
          <TouchableOpacity
            style={styles.settingsBtnInner}
            onPress={() => showToast('Ajustes próximamente', 'info')}
          >
            <Text style={styles.settingsBtnText}>⚙️ Ajustes de cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
      <Toast {...toast} />
    </View>
  );
}

function ActivityRow({ color, name, date, badge }: { color: string; name: string; date: string; badge: React.ReactNode }) {
  return (
    <View style={actStyles.row}>
      <View style={[actStyles.dot, { backgroundColor: color }]} />
      <View style={actStyles.info}>
        <Text style={actStyles.name}>{name}</Text>
        <Text style={actStyles.date}>{date}</Text>
      </View>
      {badge}
    </View>
  );
}

function InvoiceRow({ num, date, amount }: { num: string; date: string; amount: string }) {
  return (
    <View style={invStyles.row}>
      <View style={invStyles.icon}><Text style={{ fontSize: 18 }}>🧾</Text></View>
      <View style={invStyles.info}>
        <Text style={invStyles.num}>{num}</Text>
        <Text style={invStyles.meta}>{date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={invStyles.amount}>{amount}</Text>
        <Badge label="Pagada" variant="green" small />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  hero: {
    backgroundColor: Colors.surface,
    padding: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.orange,
    borderWidth: 3,
    borderColor: Colors.orangeDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 28, color: '#fff' },
  name: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.white, lineHeight: 28 },
  box: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body, marginTop: 4 },
  since: { color: Colors.muted, fontSize: 12, fontFamily: Fonts.body, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  statCell: {
    flex: 1,
    padding: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.orange, lineHeight: 28 },
  statLabel: {
    fontSize: 10,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 3,
    fontFamily: Fonts.body,
  },
  memberCard: {
    margin: 16,
    backgroundColor: '#1a0800',
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 14,
    padding: 20,
  },
  mcLabel: {
    fontSize: 11,
    color: Colors.orange,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: Fonts.bodySemiBold,
    marginBottom: 8,
  },
  mcPlan: { fontFamily: Fonts.headingXBold, fontSize: 28, color: Colors.white, marginBottom: 4 },
  mcMeta: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  mcExpires: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mcExpiresLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  mcExpiresDate: { fontFamily: Fonts.bodySemiBold, color: Colors.white, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.muted,
  },
  settingsBtn: { padding: 16 },
  settingsBtnInner: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  settingsBtnText: { fontFamily: Fonts.bodySemiBold, color: Colors.white, fontSize: 13 },
});

const actStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  name: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.white },
  date: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body, marginTop: 2 },
});

const invStyles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  num: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white, marginBottom: 2 },
  meta: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  amount: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.white },
});
