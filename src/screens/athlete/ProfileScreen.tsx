import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, withAlpha } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { useBoxConfig } from '../../context/BoxConfigContext';
import { useInvoices } from '../../hooks/useInvoices';
import type { InvoiceRow } from '../../hooks/useInvoices';
import { supabase } from '../../lib/supabase';

interface RecentBooking {
  id: string;
  class_name: string;
  class_date: string;
  class_time: string;
}

const AVATAR_COLORS = [
  '#f95c00', '#ef4444', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#64748b', '#84cc16',
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
  const { profile, session, refreshProfile } = useAuth();
  const boxConfig = useBoxConfig();
  const { invoices, loading: invLoading } = useInvoices(session?.user.id);

  const [stats, setStats] = useState({ total: 0, thisMonth: 0 });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete account
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!session) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await supabase.auth.signOut();
    } catch {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      showToast('Error al eliminar la cuenta. Inténtalo de nuevo.', 'error');
    }
  };

  const openEdit = () => {
    setEditName(profile?.name ?? '');
    setEditColor(profile?.avatar_color ?? Colors.orange);
    setEditAvatarUri(profile?.avatar_url ?? null);
    setEditOpen(true);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permiso de galería denegado', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setEditAvatarUri(result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showToast('Permiso de cámara denegado', 'error');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setEditAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (localUri: string, userId: string): Promise<string | null> => {
    try {
      const path = `${userId}/avatar.jpg`;
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { upsert: true, contentType: 'image/jpeg' });
      if (error) return null;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch {
      return null;
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }
    if (!session?.user.id) return;
    setSaving(true);
    const newInitials = initials(editName);

    let avatarUrl = profile?.avatar_url ?? null;
    const isNewPhoto = editAvatarUri && editAvatarUri !== profile?.avatar_url;
    if (isNewPhoto) {
      const uploaded = await uploadAvatar(editAvatarUri!, session.user.id);
      if (uploaded) avatarUrl = uploaded;
      else showToast('No se pudo subir la foto', 'error');
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name: editName.trim(), avatar_initials: newInitials, avatar_color: editColor, avatar_url: avatarUrl })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      showToast('Error al guardar', 'error');
      return;
    }
    await refreshProfile();
    setEditOpen(false);
    showToast('Perfil actualizado', 'success');
  };

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
        .select('id, classes!bookings_class_id_fkey(name, date, time)')
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
          class_name: b.classes.name,
          class_date: b.classes.date,
          class_time: b.classes.time,
        }))
    );
    setBookingsLoading(false);
  }, [session?.user.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const downloadInvoice = async (inv: InvoiceRow) => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #fff; color: #111; }
  .hdr { background: #f95c00; padding: 40px 48px; }
  .hdr h1 { color: #fff; font-size: 30px; font-weight: 700; letter-spacing: -0.5px; }
  .hdr p { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px; }
  .body { padding: 40px 48px; }
  .inv-num { font-size: 13px; color: #999; margin-bottom: 4px; letter-spacing: 0.5px; }
  .inv-title { font-size: 28px; font-weight: 700; margin-bottom: 36px; }
  .field { margin-bottom: 24px; }
  .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; margin-bottom: 4px; }
  .val { font-size: 15px; font-weight: 500; }
  hr { border: none; border-top: 1px solid #eee; margin: 32px 0; }
  .total-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .total-amount { font-size: 36px; font-weight: 700; color: #f95c00; }
  .badge { display: inline-block; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .paid { background: #dcfce7; color: #16a34a; }
  .pending { background: #fef9c3; color: #ca8a04; }
  .footer { padding: 20px 48px; background: #f8f8f8; border-top: 1px solid #eee; font-size: 11px; color: #aaa; }
</style></head><body>
  <div class="hdr"><h1>${boxConfig.fiscal_name ?? boxConfig.name}</h1><p>Factura oficial</p></div>
  <div class="body">
    <div class="inv-num">${inv.number}</div>
    <div class="inv-title">Factura</div>
    <div class="field"><div class="lbl">Atleta</div><div class="val">${inv.member_name}</div></div>
    <div class="field"><div class="lbl">Fecha</div><div class="val">${fmtDate(inv.date)}</div></div>
    <div class="field"><div class="lbl">Plan / Servicio</div><div class="val">${inv.plan_name}</div></div>
    <hr>
    <div class="total-row">
      <div><div class="lbl">Total</div><div class="total-amount">${fmtAmount(inv.amount)}</div></div>
      <span class="badge ${inv.paid ? 'paid' : 'pending'}">${inv.paid ? 'Pagada' : 'Pendiente de pago'}</span>
    </div>
  </div>
  <div class="footer">${boxConfig.fiscal_name ?? boxConfig.name} &nbsp;·&nbsp; ${inv.number}</div>
</body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar factura' });
      } else {
        showToast('Compartir no disponible en este dispositivo', 'error');
      }
    } catch {
      showToast('No se pudo generar la factura', 'error');
    }
  };

  const statusBadge = profile?.membership_status === 'active' ? 'orange' : profile?.membership_status === 'pending' ? 'yellow' : 'red';
  const statusLabel = profile?.membership_status === 'active' ? 'Activa' : profile?.membership_status === 'pending' ? 'Pendiente' : 'Inactiva';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={openEdit} activeOpacity={0.8}>
            <View style={[styles.avatarBig, { backgroundColor: profile?.avatar_color ?? Colors.orange, borderColor: boxConfig.primary_color }]}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>{profile?.avatar_initials ?? '?'}</Text>
              )}
            </View>
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarIcon}>✏️</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.name ?? '—'}</Text>
            <Text style={styles.box}>{boxConfig.name}</Text>
            <TouchableOpacity onPress={openEdit} style={styles.editNameBtn}>
              <Text style={[styles.editNameText, { color: boxConfig.primary_color }]}>Editar perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {bookingsLoading ? (
            <ActivityIndicator color={boxConfig.primary_color} style={{ flex: 1, padding: 16 }} />
          ) : (
            <>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: boxConfig.primary_color }]}>{stats.total}</Text>
                <Text style={styles.statLabel}>Clases</Text>
              </View>
              <View style={[styles.statCell, styles.statCellBorder]}>
                <Text style={[styles.statValue, { color: boxConfig.primary_color }]}>{stats.thisMonth}</Text>
                <Text style={styles.statLabel}>Este mes</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: boxConfig.primary_color }]}>{profile?.plan ? '✓' : '—'}</Text>
                <Text style={styles.statLabel}>Membresía</Text>
              </View>
            </>
          )}
        </View>

        {/* Membership card */}
        <View style={[styles.memberCard, { borderColor: boxConfig.primary_color, backgroundColor: withAlpha(boxConfig.primary_color, 0.1) }]}>
          <Text style={[styles.mcLabel, { color: boxConfig.primary_color }]}>Mi membresía</Text>
          <Text style={styles.mcPlan}>{profile?.plan ?? 'Sin plan'}</Text>
          <Text style={styles.mcMeta}>{boxConfig.name}</Text>
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
                color={boxConfig.primary_color}
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
            <ActivityIndicator color={boxConfig.primary_color} style={{ marginTop: 8 }} />
          ) : invoices.length === 0 ? (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 13, marginTop: 4 }}>Sin facturas aún</Text>
          ) : (
            invoices.slice(0, 5).map(inv => (
              <InvoiceCard
                key={inv.id}
                num={inv.number}
                date={`${fmtDate(inv.date)} · ${inv.plan_name}`}
                amount={fmtAmount(inv.amount)}
                paid={inv.paid}
                onDownload={() => downloadInvoice(inv)}
              />
            ))
          )}
        </View>

        {/* Delete account */}
        <View style={styles.deleteSection}>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteConfirmOpen(true)}>
            <Text style={styles.deleteBtnText}>Eliminar mi cuenta</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Delete account confirmation modal */}
      <Modal visible={deleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)}>
        <View style={deleteStyles.overlay}>
          <View style={deleteStyles.card}>
            <Text style={deleteStyles.title}>¿Eliminar cuenta?</Text>
            <Text style={deleteStyles.body}>
              Se borrarán permanentemente tu perfil, reservas y todos tus datos. Esta acción no se puede deshacer.
            </Text>
            <TouchableOpacity
              style={[deleteStyles.confirmBtn, deleting && { opacity: 0.6 }]}
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              <Text style={deleteStyles.confirmText}>{deleting ? 'Eliminando...' : 'Sí, eliminar mi cuenta'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={deleteStyles.cancelBtn} onPress={() => setDeleteConfirmOpen(false)} disabled={deleting}>
              <Text style={deleteStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={editStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditOpen(false)} />
          <View style={editStyles.sheet}>
            <View style={editStyles.handle} />
            <Text style={editStyles.title}>Editar perfil</Text>

            {/* Avatar preview */}
            <View style={editStyles.avatarRow}>
              <View style={[editStyles.avatarPreview, { backgroundColor: editColor }]}>
                {editAvatarUri ? (
                  <Image source={{ uri: editAvatarUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <Text style={editStyles.avatarPreviewText}>
                    {editName.trim() ? initials(editName) : '?'}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <TouchableOpacity style={editStyles.photoBtn} onPress={pickFromGallery}>
                  <Text style={editStyles.photoBtnText}>📷 Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={editStyles.photoBtn} onPress={pickFromCamera}>
                  <Text style={editStyles.photoBtnText}>📸 Cámara</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name */}
            <Text style={editStyles.label}>Nombre completo</Text>
            <TextInput
              style={editStyles.input}
              placeholder="Tu nombre"
              placeholderTextColor={Colors.muted}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />

            {/* Color picker */}
            <Text style={editStyles.label}>Color de avatar</Text>
            <View style={editStyles.colorGrid}>
              {AVATAR_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[editStyles.colorDot, { backgroundColor: c }, editColor === c && editStyles.colorDotSel]}
                  onPress={() => setEditColor(c)}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={editStyles.btnRow}>
              <TouchableOpacity style={editStyles.cancelBtn} onPress={() => setEditOpen(false)}>
                <Text style={editStyles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[editStyles.saveBtn, { backgroundColor: boxConfig.primary_color }, saving && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={saving}
              >
                <Text style={editStyles.saveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 16 }} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

function InvoiceCard({ num, date, amount, paid, onDownload }: { num: string; date: string; amount: string; paid: boolean; onDownload: () => void }) {
  const { primary_color } = useBoxConfig();
  return (
    <TouchableOpacity style={invStyles.row} onPress={onDownload} activeOpacity={0.7}>
      <View style={invStyles.icon}><Text style={{ fontSize: 18 }}>🧾</Text></View>
      <View style={invStyles.info}>
        <Text style={invStyles.num}>{num}</Text>
        <Text style={invStyles.meta}>{date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={invStyles.amount}>{amount}</Text>
        <Badge label={paid ? 'Pagada' : 'Pendiente'} variant={paid ? 'green' : 'yellow'} small />
      </View>
      <View style={invStyles.dlBtn}>
        <Text style={[invStyles.dlIcon, { color: primary_color }]}>↓</Text>
      </View>
    </TouchableOpacity>
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
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: Colors.orangeDim,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 28, color: '#fff' },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarIcon: { fontSize: 11 },
  name: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.white, lineHeight: 28 },
  box: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body, marginTop: 4 },
  editNameBtn: { marginTop: 8, alignSelf: 'flex-start' },
  editNameText: { fontSize: 12, color: Colors.orange, fontFamily: Fonts.bodySemiBold },
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
  statCellBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.orange, lineHeight: 28 },
  statLabel: { fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3, fontFamily: Fonts.body },
  memberCard: {
    margin: 16,
    backgroundColor: '#1a0800',
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 14,
    padding: 20,
  },
  mcLabel: { fontSize: 11, color: Colors.orange, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Fonts.bodySemiBold, marginBottom: 8 },
  mcPlan: { fontFamily: Fonts.headingXBold, fontSize: 28, color: Colors.white, marginBottom: 4 },
  mcMeta: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  mcExpires: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mcExpiresLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  mcExpiresDate: { fontFamily: Fonts.bodySemiBold, color: Colors.white, fontSize: 13 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 18, textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.muted },
  deleteSection: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  deleteBtn: {
    paddingVertical: 14, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.red,
    alignItems: 'center',
  },
  deleteBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.red },
});

const actStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  info: { flex: 1 },
  name: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: Colors.white },
  date: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body, marginTop: 2 },
});

const invStyles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 12, paddingHorizontal: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  num: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white, marginBottom: 2 },
  meta: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  amount: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.white },
  dlBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  dlIcon: { fontSize: 16, color: Colors.orange, fontWeight: '700' },
});

const deleteStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 24, width: '100%',
  },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.white, marginBottom: 12 },
  body: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.body, lineHeight: 21, marginBottom: 24 },
  confirmBtn: {
    backgroundColor: Colors.red, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 10,
  },
  confirmText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 15 },
  cancelBtn: {
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontFamily: Fonts.bodySemiBold, color: Colors.muted, fontSize: 15 },
});

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.white, marginBottom: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarPreview: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPreviewText: { fontFamily: Fonts.headingXBold, fontSize: 22, color: '#fff' },
  avatarHint: { flex: 1, fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  photoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
  },
  photoBtnText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.bodySemiBold },
  label: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 16, marginBottom: 20,
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSel: { borderWidth: 3, borderColor: Colors.white },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelText: { fontFamily: Fonts.bodySemiBold, color: Colors.muted, fontSize: 14 },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.orange, alignItems: 'center' },
  saveText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 14 },
});
