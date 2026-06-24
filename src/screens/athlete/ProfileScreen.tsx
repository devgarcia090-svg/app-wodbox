import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { useInvoices } from '../../hooks/useInvoices';
import { supabase } from '../../lib/supabase';

interface RecentBooking {
  id: string;
  status: string;
  class_name: string;
  class_date: string;
  class_time: string;
}

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function fmtExpiry(iso: string | null) {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso + 'T00:00:00');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} de ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtAmount(n: number) {
  return n.toFixed(2).replace('.', ',') + '€';
}

export function ProfileScreen() {
  const { toast, showToast } = useToast();
  const { profile, session } = useAuth();
  const { invoices, loading: invLoading } = useInvoices(session?.user.id);

  const [stats, setStats] = useState({ total: 0, thisMonth: 0 });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!session?.user.id) return;
    setBookingsLoading(true);

    const userId = session.user.id;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const [totalRes, monthRes, recentRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', userId)
        .eq('status', 'confirmed'),
      supabase
        .from('bookings')
        .select('id, classes!bookings_class_id_fkey(date)', { count: 'exact' })
        .eq('athlete_id', userId)
        .eq('status', 'confirmed')
        .gte('classes.date', monthStart),
      supabase
        .from('bookings')
        .select('id, status, classes!bookings_class_id_fkey(name, date, time)')
        .eq('athlete_id', userId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    setStats({ total: totalRes.count ?? 0, thisMonth: monthRes.count ?? 0 });

    setRecentBookings(
      ((recentRes.data || []) as any[])
        .filter(b => b.classes)
        .map(b => ({
          id: b.id,
          status: b.status,
          class_name: b.classes.name,
          class_date: b.classes.date,
          class_time: b.classes.time,
        }))
    );
    setBookingsLoading(false);
  }, [session?.user.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const statusBadge = profile?.membership_status === 'active' ? 'orange' : profile?.membership_status === 'pending' ? 'yellow' : 'red';
  const statusLabel = profile?.membership_status === 'active' ? 'Activa' : profile?.membership_status === 'pending' ? 'Pendiente' : 'Inactiva';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatarBig, { backgroundColor: profile?.avatar_color ?? Colors.orange }]}>
            <Text style={styles.avatarText}>{profile?.avatar_initials ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.name ?? '—'}</Text>
            <Text style={styles.box}>CrossFit Murcia</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {bookingsLoading ? (
            <ActivityIndicator color={Colors.orange} style={{ flex: 1, padding: 16 }} />
          ) : (
            <>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Clases</Text>
              </View>
              <View style={[styles.statCell, styles.statCellBorder]}>
                <Text style={styles.statValue}>{stats.thisMonth}</Text>
                <Text style={styles.statLabel}>Este mes</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{profile?.plan ? '✓' : '—'}</Text>
                <Text style={styles.statLabel}>Membresía</Text>
              </View>
            </>
          )}
        </View>

        {/* Membership card */}
        <View style={styles.memberCard}>
          <Text style={styles.mcLabel}>Mi membresía</Text>
          <Text style={styles.mcPlan}>{profile?.plan ?? 'Sin plan'}</Text>
          <Text style={styles.mcMeta}>CrossFit Murcia</Text>
          <View style={styles.mcExpires}>
            <View>
              <Text style={styles.mcExpiresLabel}>Válida hasta</Text>
              <Text style={styles.mcExpiresDate}>{fmtExpiry(profile?.membership_expires ?? null)}</Text>
            </View>
            <Badge label={statusLabel} variant={statusBadge} />
          </View>
        </View>

        {/* Recent activity */}
        {!bookingsLoading && recentBookings.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actividad reciente</Text>
            </View>
            {recentBookings.map(b => (
              <ActivityRow
                key={b.id}
                color={Colors.orange}
                name={`${b.class_name} · ${b.class_time}`}
                date={fmtDate(b.class_date)}
                badge={<Badge label="Reservada" variant="orange" />}
              />
            ))}
          </>
        )}

        {/* Invoices */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis facturas</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {invLoading ? (
            <ActivityIndicator color={Colors.orange} style={{ marginTop: 8 }} />
          ) : invoices.length === 0 ? (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 13, marginTop: 4 }}>Sin facturas aún</Text>
          ) : (
            invoices.slice(0, 5).map(inv => (
              <InvoiceRow
                key={inv.id}
                num={inv.number}
                date={`${fmtDate(inv.date)} · ${inv.plan_name}`}
                amount={fmtAmount(inv.amount)}
                paid={inv.paid}
              />
            ))
          )}
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

function InvoiceRow({ num, date, amount, paid }: { num: string; date: string; amount: string; paid: boolean }) {
  return (
    <View style={invStyles.row}>
      <View style={invStyles.icon}><Text style={{ fontSize: 18 }}>🧾</Text></View>
      <View style={invStyles.info}>
        <Text style={invStyles.num}>{num}</Text>
        <Text style={invStyles.meta}>{date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={invStyles.amount}>{amount}</Text>
        <Badge label={paid ? 'Pagada' : 'Pendiente'} variant={paid ? 'green' : 'yellow'} small />
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
    borderWidth: 3,
    borderColor: Colors.orangeDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 28, color: '#fff' },
  name: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.white, lineHeight: 28 },
  box: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body, marginTop: 4 },
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
