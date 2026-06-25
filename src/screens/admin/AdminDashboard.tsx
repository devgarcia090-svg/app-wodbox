import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Dimensions,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { TODAY_ISO, DATE_PILLS, TODAY_IDX } from '../../data/mockData';
import { useClasses } from '../../hooks/useClasses';
import { useMembers, MemberRow } from '../../hooks/useMembers';
import { useInvoices } from '../../hooks/useInvoices';
import { useExpiringMembers } from '../../hooks/useExpiringMembers';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/common/Avatar';

// 60px = card horizontal margins (16×2) + card horizontal padding (14×2)
const SLOTS_PER_ROW = 6;
const SLOT_GAP = 5;
const SLOT_SIZE = Math.floor(
  (Dimensions.get('window').width - 60 - (SLOTS_PER_ROW - 1) * SLOT_GAP) / SLOTS_PER_ROW,
);
const SLOT_RADIUS = Math.round(SLOT_SIZE * 0.22);

type AdminTab = 'clases' | 'miembros' | 'cobros' | 'chat';

const BOTTOM_TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'clases',   label: 'Clases',   icon: '📅' },
  { key: 'miembros', label: 'Miembros', icon: '👥' },
  { key: 'cobros',   label: 'Cobros',   icon: '💳' },
  { key: 'chat',     label: 'Chat',     icon: '💬' },
];

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('clases');
  const [classRefreshKey, setClassRefreshKey] = useState(0);
  const [memberRefreshKey, setMemberRefreshKey] = useState(0);
  const { toast, showToast } = useToast();

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {activeTab === 'clases' && (
          <ClasesPanel
            showToast={showToast}
            refreshKey={classRefreshKey}
            onCreated={() => setClassRefreshKey(k => k + 1)}
          />
        )}
        {activeTab === 'miembros' && <MiembrosPanel showToast={showToast} refreshKey={memberRefreshKey} />}
        {activeTab === 'cobros' && <CobrosPanel showToast={showToast} />}
        {activeTab === 'chat' && <AdminChatPanel showToast={showToast} />}
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        {BOTTOM_TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={styles.bottomItem} onPress={() => setActiveTab(tab.key)}>
              {active && <View style={styles.bottomActiveLine} />}
              <Text style={styles.bottomIcon}>{tab.icon}</Text>
              <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Toast {...toast} />
    </View>
  );
}

// ─── Clases Panel ─────────────────────────────────────────────────────────────

function ClasesPanel({ showToast, refreshKey, onCreated }: { showToast: (m: string, t: any) => void; refreshKey: number; onCreated: () => void }) {
  const [showNueva, setShowNueva] = useState(false);
  const [activeDateIdx, setActiveDateIdx] = useState(TODAY_IDX >= 0 ? TODAY_IDX : 0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editFields, setEditFields] = useState({ name: '', time: '', coach: '', capacity: '', duration: '', wod: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const selectedDate = DATE_PILLS[activeDateIdx]?.isoDate ?? TODAY_ISO;
  const { classes, loading, refetch } = useClasses(selectedDate);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const openEdit = (cls: any) => {
    setEditFields({
      name: cls.name,
      time: cls.time,
      coach: cls.coach,
      capacity: String(cls.capacity),
      duration: cls.duration,
      wod: cls.wod ?? '',
    });
    setEditingClass(cls);
  };

  const saveEdit = async () => {
    if (!editingClass) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('classes')
      .update({
        name: editFields.name.trim(),
        time: editFields.time.trim(),
        coach: editFields.coach.trim(),
        capacity: parseInt(editFields.capacity, 10) || editingClass.capacity,
        duration: editFields.duration.trim(),
        wod: editFields.wod.trim() || null,
      })
      .eq('id', editingClass.id);
    setSavingEdit(false);
    if (error) { showToast('Error al guardar', 'error'); return; }
    showToast('✅ Clase actualizada', 'success');
    setEditingClass(null);
    refetch();
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    setConfirmDeleteId(null);
    if (error) showToast('Error al eliminar', 'error');
    else { showToast('Clase eliminada', 'success'); refetch(); }
  };

  const timePills = ['Todas', ...[...new Set(classes.map(c => c.time))].sort()];
  const filtered = selectedTime && selectedTime !== 'Todas'
    ? classes.filter(c => c.time === selectedTime)
    : classes;

  if (showNueva) {
    return (
      <NuevaClasePanel
        showToast={showToast}
        onCreated={() => { onCreated(); setShowNueva(false); refetch(); }}
        onBack={() => setShowNueva(false)}
      />
    );
  }

  return (
    <View style={panelStyles.panel}>
      <View style={clsHeaderStyles.row}>
        <Text style={clsHeaderStyles.title}>Clases</Text>
        <TouchableOpacity style={clsHeaderStyles.nuevaBtn} onPress={() => setShowNueva(true)}>
          <Text style={clsHeaderStyles.nuevaBtnText}>+ Nueva clase</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={adminDateStyles.scroll} contentContainerStyle={adminDateStyles.content}>
        {DATE_PILLS.map((d, i) => (
          <TouchableOpacity
            key={i}
            style={[adminDateStyles.pill, activeDateIdx === i && adminDateStyles.pillActive]}
            onPress={() => { setActiveDateIdx(i); setSelectedTime(null); }}
          >
            <Text style={[adminDateStyles.pillDay, activeDateIdx === i && adminDateStyles.pillTextActive]}>{d.day}</Text>
            <Text style={[adminDateStyles.pillNum, activeDateIdx === i && adminDateStyles.pillTextActive]}>{d.num}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={adminTimeStyles.scroll} contentContainerStyle={adminTimeStyles.content}>
        {timePills.map(t => {
          const active = t === 'Todas' ? !selectedTime || selectedTime === 'Todas' : selectedTime === t;
          return (
            <TouchableOpacity key={t} style={[adminTimeStyles.pill, active && adminTimeStyles.pillActive]} onPress={() => setSelectedTime(t)}>
              <Text style={[adminTimeStyles.pillText, active && adminTimeStyles.pillTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={panelStyles.content}>
        {loading ? (
          <ActivityIndicator color={Colors.orange} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', marginTop: 32 }}>No hay clases para este día</Text>
        ) : null}
        {filtered.map(cls => {

          const pct = Math.round((cls.enrolled / cls.capacity) * 100);
          const fillColor = pct >= 90 ? Colors.red : pct >= 60 ? Colors.yellow : Colors.green;
          const isFull = pct >= 100;
          return (
            <View key={cls.id} style={clsStyles.card}>
              <View style={clsStyles.cardHeader}>
                <View style={clsStyles.timeBlock}>
                  <Text style={clsStyles.cardTime}>{cls.time}</Text>
                  <Text style={clsStyles.cardDuration}>{cls.duration}</Text>
                </View>
                <View style={clsStyles.info}>
                  <Text style={clsStyles.name}>{cls.name}</Text>
                  <Text style={clsStyles.coachText}>👤 {cls.coach}</Text>
                </View>
                <View style={clsStyles.rightCol}>
                  <Text style={[clsStyles.spotsText, isFull && { color: Colors.red }]}>{cls.enrolled}/{cls.capacity}</Text>
                  {isFull && <Text style={clsStyles.fullLabel}>LLENA</Text>}
                </View>
              </View>
              <View style={clsStyles.slotsGrid}>
                {Array.from({ length: cls.capacity }, (_, i) => {
                  const att = cls.attendees[i];
                  const isEnrolled = i < cls.enrolled;
                  if (att) {
                    return (
                      <Avatar
                        key={i}
                        url={att.url}
                        initials={att.initials}
                        color={att.color}
                        size={SLOT_SIZE}
                        square
                        onPress={att.url ? () => setLightboxUrl(att.url!) : undefined}
                      />
                    );
                  }
                  if (isEnrolled) {
                    return (
                      <View key={i} style={clsStyles.slotGhost}>
                        <Text style={clsStyles.slotGhostText}>?</Text>
                      </View>
                    );
                  }
                  return <View key={i} style={clsStyles.slotEmpty} />;
                })}
              </View>

              <View style={clsStyles.cardActions}>
                <TouchableOpacity style={clsStyles.editBtn} onPress={() => { setConfirmDeleteId(null); openEdit(cls); }}>
                  <Text style={clsStyles.editBtnText}>✏️  Editar</Text>
                </TouchableOpacity>
                {confirmDeleteId === cls.id ? (
                  <View style={clsStyles.confirmRow}>
                    <Text style={clsStyles.confirmText}>¿Eliminar?</Text>
                    <TouchableOpacity style={clsStyles.confirmYes} onPress={() => deleteClass(cls.id)}>
                      <Text style={clsStyles.confirmYesText}>Sí</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={clsStyles.confirmNo} onPress={() => setConfirmDeleteId(null)}>
                      <Text style={clsStyles.confirmNoText}>No</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={clsStyles.deleteBtn} onPress={() => setConfirmDeleteId(cls.id)}>
                    <Text style={clsStyles.deleteBtnText}>🗑  Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!lightboxUrl} transparent animationType="fade" onRequestClose={() => setLightboxUrl(null)}>
        <TouchableOpacity style={lbStyles.overlay} activeOpacity={1} onPress={() => setLightboxUrl(null)}>
          {lightboxUrl && <Image source={{ uri: lightboxUrl }} style={lbStyles.img} resizeMode="contain" />}
          <Text style={lbStyles.hint}>Toca para cerrar</Text>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!editingClass} transparent animationType="slide" onRequestClose={() => setEditingClass(null)}>
        <KeyboardAvoidingView style={editClsStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditingClass(null)} />
          <View style={editClsStyles.sheet}>
            <View style={editClsStyles.handle} />
            <Text style={editClsStyles.title}>Editar clase</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={editClsStyles.label}>Nombre</Text>
              <TextInput style={editClsStyles.input} value={editFields.name} onChangeText={v => setEditFields(f => ({ ...f, name: v }))} placeholderTextColor={Colors.muted} />

              <View style={editClsStyles.row}>
                <View style={editClsStyles.half}>
                  <Text style={editClsStyles.label}>Hora</Text>
                  <TextInput style={editClsStyles.input} value={editFields.time} onChangeText={v => setEditFields(f => ({ ...f, time: v }))} placeholderTextColor={Colors.muted} />
                </View>
                <View style={editClsStyles.half}>
                  <Text style={editClsStyles.label}>Duración</Text>
                  <TextInput style={editClsStyles.input} value={editFields.duration} onChangeText={v => setEditFields(f => ({ ...f, duration: v }))} placeholderTextColor={Colors.muted} />
                </View>
              </View>

              <View style={editClsStyles.row}>
                <View style={editClsStyles.half}>
                  <Text style={editClsStyles.label}>Coach</Text>
                  <TextInput style={editClsStyles.input} value={editFields.coach} onChangeText={v => setEditFields(f => ({ ...f, coach: v }))} placeholderTextColor={Colors.muted} />
                </View>
                <View style={editClsStyles.half}>
                  <Text style={editClsStyles.label}>Plazas máx.</Text>
                  <TextInput style={editClsStyles.input} value={editFields.capacity} onChangeText={v => setEditFields(f => ({ ...f, capacity: v }))} keyboardType="numeric" placeholderTextColor={Colors.muted} />
                </View>
              </View>

              <Text style={editClsStyles.label}>WOD</Text>
              <TextInput
                style={[editClsStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={editFields.wod}
                onChangeText={v => setEditFields(f => ({ ...f, wod: v }))}
                multiline
                placeholderTextColor={Colors.muted}
                placeholder="Describe el entrenamiento..."
              />

              <View style={editClsStyles.btnRow}>
                <TouchableOpacity style={editClsStyles.cancelBtn} onPress={() => setEditingClass(null)}>
                  <Text style={editClsStyles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[editClsStyles.saveBtn, savingEdit && { opacity: 0.6 }]} onPress={saveEdit} disabled={savingEdit}>
                  <Text style={editClsStyles.saveText}>{savingEdit ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Tariffs ──────────────────────────────────────────────────────────────────

const TARIFFS = [
  { id: '10 Clases', name: '10 CLASES', price: '45', unit: '€/bono', desc: 'Sin caducidad mensual.', features: ['10 clases de cualquier tipo', 'Validez 1 mes'] },
  { id: '14 Clases', name: '14 CLASES', price: '55', unit: '€/bono', desc: 'Ideal 3-4 veces/semana.', features: ['14 clases de cualquier tipo', 'Validez 1 mes'], popular: true },
  { id: 'Ilimitado', name: 'ILIMITADO', price: '65', unit: '€/mes', desc: 'Sin límite de clases.', features: ['Clases ilimitadas', 'Open Box incluido'] },
  { id: 'Menor 20', name: 'MENOR DE 20', price: '30', unit: '€/mes', desc: 'Tarifa especial menores.', features: ['Clases ilimitadas', 'Válido con DNI'], badge: 'OFERTA JOVEN' },
];

// ─── Miembros Panel ────────────────────────────────────────────────────────────

function MiembrosPanel({ showToast, refreshKey }: { showToast: (m: string, t: any) => void; refreshKey: number }) {
  const { members, loading, refetch } = useMembers();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<string | null>(null);
  const [editRemaining, setEditRemaining] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedTariff, setSelectedTariff] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (refreshKey > 0) refetch();
  }, [refreshKey]);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isClassPack = (plan: string | null) =>
    plan === '10 Clases' || plan === '14 Clases';

  const savePlan = async (member: MemberRow, plan: string) => {
    if (member.isPendingInvite) {
      setSavingId(member.id);
      const { error } = await supabase
        .from('pending_invites')
        .update({ plan })
        .eq('id', member.id);
      setSavingId(null);
      if (!error) { showToast('✅ Tarifa actualizada', 'success'); refetch(); setExpandedId(null); }
      else showToast('Error al guardar', 'error');
      return;
    }
    setSavingId(member.id);
    const remaining = isClassPack(plan)
      ? (parseInt(editRemaining) >= 0 ? parseInt(editRemaining) : null)
      : null;
    const { error } = await supabase
      .from('profiles')
      .update({ plan, membership_status: 'active', classes_remaining: remaining })
      .eq('id', member.id);
    setSavingId(null);
    if (!error) { showToast('✅ Tarifa actualizada', 'success'); refetch(); setExpandedId(null); }
    else showToast('Error al guardar', 'error');
  };

  const deleteMember = async (member: MemberRow) => {
    if (member.isPendingInvite) {
      const { error } = await supabase.from('pending_invites').delete().eq('id', member.id);
      if (!error) { showToast('Invitación eliminada', 'success'); refetch(); }
      else showToast('Error al eliminar', 'error');
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ membership_status: 'inactive' })
        .eq('id', member.id);
      if (!error) { showToast('Atleta desactivado', 'success'); refetch(); }
      else showToast('Error al desactivar', 'error');
    }
    setExpandedId(null);
  };

  const handleInvite = async () => {
    if (!newName.trim() || !newEmail.trim() || !selectedTariff) {
      showToast('Completa nombre, email y tarifa', 'error');
      return;
    }
    setInviting(true);
    const { error } = await supabase.from('pending_invites').insert({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      plan: selectedTariff,
    });
    setInviting(false);
    if (error) {
      showToast(error.message.includes('unique') ? 'Ese email ya existe' : 'Error al crear atleta', 'error');
      return;
    }
    showToast(`✅ Atleta añadido (${newEmail})`, 'success');
    setShowForm(false);
    setNewName(''); setNewEmail(''); setSelectedTariff(null);
    refetch();
  };

  if (showForm) {
    return (
      <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
        <TouchableOpacity onPress={() => setShowForm(false)} style={addStyles.backRow}>
          <Text style={addStyles.backText}>‹ Volver a miembros</Text>
        </TouchableOpacity>
        <Text style={addStyles.formTitle}>Nuevo atleta</Text>

        <Text style={addStyles.label}>Nombre completo</Text>
        <TextInput style={addStyles.input} placeholder="Nombre Apellido" placeholderTextColor={Colors.muted}
          value={newName} onChangeText={setNewName} />

        <Text style={addStyles.label}>Email</Text>
        <TextInput style={addStyles.input} placeholder="atleta@email.com" placeholderTextColor={Colors.muted}
          value={newEmail} onChangeText={setNewEmail} autoCapitalize="none" keyboardType="email-address" />

        <Text style={[addStyles.label, { marginTop: 18 }]}>Selecciona tarifa</Text>
        <View style={addStyles.tariffGrid}>
          {TARIFFS.map(t => {
            const sel = selectedTariff === t.id;
            return (
              <TouchableOpacity key={t.id} style={[addStyles.tariffCard, sel && addStyles.tariffCardSel]} onPress={() => setSelectedTariff(t.id)} activeOpacity={0.8}>
                {t.popular && <View style={addStyles.tariffBadge}><Text style={addStyles.tariffBadgeText}>MÁS POPULAR</Text></View>}
                {t.badge && <View style={[addStyles.tariffBadge, { backgroundColor: Colors.surface3 }]}><Text style={[addStyles.tariffBadgeText, { color: Colors.muted }]}>{t.badge}</Text></View>}
                <Text style={[addStyles.tariffName, sel && { color: Colors.orange }]}>{t.name}</Text>
                <Text style={addStyles.tariffDesc}>{t.desc}</Text>
                <View style={addStyles.tariffPriceRow}>
                  <Text style={addStyles.tariffCurrency}>€</Text>
                  <Text style={[addStyles.tariffPrice, sel && { color: Colors.orange }]}>{t.price}</Text>
                  <Text style={addStyles.tariffUnit}>{t.unit}</Text>
                </View>
                {t.features.map((f, i) => (
                  <Text key={i} style={[addStyles.tariffFeature, sel && { color: Colors.white }]}>✓ {f}</Text>
                ))}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[addStyles.sendBtn, inviting && { opacity: 0.6 }]} onPress={handleInvite} activeOpacity={0.85} disabled={inviting}>
          <Text style={addStyles.sendBtnText}>{inviting ? 'Creando...' : '+ Añadir atleta'}</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  return (
    <View style={panelStyles.panel}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <TextInput
          style={memStyles.search}
          placeholder="🔍 Buscar atleta..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        {loading ? (
          <ActivityIndicator color={Colors.orange} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', marginTop: 32 }}>
            {search ? 'Sin resultados' : 'Sin miembros aún'}
          </Text>
        ) : null}

        {filtered.map(m => {
          const isExpanded = expandedId === m.id;
          const statusVariant = m.membership_status === 'active' ? 'green' : m.membership_status === 'pending' ? 'yellow' : 'red';
          const statusLabel = m.membership_status === 'active' ? 'Activo' : m.membership_status === 'pending' ? 'Pendiente' : 'Inactivo';

          return (
            <View key={m.id} style={memStyles.card}>
              <TouchableOpacity
                style={memStyles.row}
                onPress={() => {
                  setExpandedId(isExpanded ? null : m.id);
                  setEditPlan(m.plan);
                  setEditRemaining(m.classes_remaining?.toString() ?? '');
                }}
                activeOpacity={0.8}
              >
                <View style={[memStyles.avatar, { backgroundColor: m.avatar_color }]}>
                  <Text style={memStyles.avatarText}>{m.avatar_initials}</Text>
                </View>
                <View style={memStyles.info}>
                  <Text style={memStyles.name}>{m.name}</Text>
                  <Text style={memStyles.plan}>{m.isPendingInvite ? `📧 ${m.email}` : m.plan}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={statusLabel} variant={statusVariant} />
                  <Text style={{ color: Colors.muted, fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={expandStyles.body}>
                  {m.membership_expires && (
                    <Text style={expandStyles.detail}>Vence: {m.membership_expires}</Text>
                  )}
                  {m.email && (
                    <Text style={expandStyles.detail}>Email: {m.email}</Text>
                  )}

                  {!m.isPendingInvite && (
                    <>
                      <Text style={expandStyles.sectionLabel}>Facturas</Text>
                      <MemberInvoices memberId={m.id} />
                    </>
                  )}

                  <Text style={expandStyles.sectionLabel}>Cambiar tarifa</Text>
                  <View style={expandStyles.tariffRow}>
                    {TARIFFS.map(t => {
                      const sel = editPlan === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[expandStyles.tariffChip, sel && expandStyles.tariffChipSel]}
                          onPress={() => setEditPlan(t.id)}
                        >
                          <Text style={[expandStyles.tariffChipText, sel && expandStyles.tariffChipTextSel]}>{t.name}</Text>
                          <Text style={[expandStyles.tariffChipPrice, sel && { color: Colors.orange }]}>€{t.price}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {isClassPack(editPlan) && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={expandStyles.sectionLabel}>Clases restantes</Text>
                      <TextInput
                        style={expandStyles.remainingInput}
                        placeholder="Ej: 7"
                        placeholderTextColor={Colors.muted}
                        value={editRemaining}
                        onChangeText={setEditRemaining}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                    </View>
                  )}

                  <View style={expandStyles.actions}>
                    <TouchableOpacity
                      style={[expandStyles.saveBtn, savingId === m.id && { opacity: 0.6 }]}
                      onPress={() => editPlan && savePlan(m, editPlan)}
                      disabled={savingId === m.id || !editPlan}
                    >
                      <Text style={expandStyles.saveBtnText}>{savingId === m.id ? 'Guardando...' : '✓ Guardar tarifa'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={expandStyles.deleteBtn}
                      onPress={() => deleteMember(m)}
                    >
                      <Text style={expandStyles.deleteBtnText}>{m.isPendingInvite ? 'Eliminar invitación' : 'Desactivar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={memStyles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={memStyles.addBtnText}>+ Añadir atleta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Cobros Panel ─────────────────────────────────────────────────────────────

function CobrosPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  const { invoices, loading, markAsPaid, createInvoice } = useInvoices();
  const { members: expiring, loading: expiringLoading, refetch: refetchExpiring } = useExpiringMembers();
  const { members: allMembers } = useMembers();
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const [nfMemberId, setNfMemberId] = useState('');
  const [nfPlan, setNfPlan] = useState('');
  const [nfAmount, setNfAmount] = useState('');
  const [nfPayMethod, setNfPayMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [nfBusy, setNfBusy] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const pending = invoices.filter(i => !i.paid);
  const paid = invoices.filter(i => i.paid);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cobradoMes = paid.filter(i => i.date.startsWith(thisMonth)).reduce((s, i) => s + i.amount, 0);
  const pendienteTotal = pending.reduce((s, i) => s + i.amount, 0);

  const todayIso = now.toISOString().slice(0, 10);

  const selectedMember = allMembers.find(m => m.id === nfMemberId);

  const handleMarkPaid = async (id: string, name: string) => {
    await markAsPaid(id);
    refetchExpiring();
    showToast(`✅ Factura de ${name} marcada como pagada`, 'success');
  };

  const handleCreateInvoice = async (memberId?: string) => {
    const mid = memberId ?? nfMemberId;
    if (!mid || !nfPlan || !nfAmount) {
      showToast('Rellena todos los campos', 'error');
      return;
    }
    setNfBusy(true);
    const { error } = await createInvoice({
      member_id: mid,
      plan_name: nfPlan,
      amount: parseFloat(nfAmount.replace(',', '.')),
      date: todayIso,
      payment_method: nfPayMethod,
    });
    setNfBusy(false);
    if (!error) {
      showToast('Factura creada', 'success');
      setShowNuevaFactura(false);
      setNfMemberId(''); setNfPlan(''); setNfAmount(''); setNfPayMethod('efectivo');
    } else {
      showToast('Error al crear factura', 'error');
    }
  };

  const expiryLabel = (m: typeof expiring[0]) => {
    if (m.reason === 'expired') return `Venció ${m.membership_expires}`;
    if (m.reason === 'expiring_soon') return `Vence ${m.membership_expires}`;
    return 'Sin clases restantes';
  };

  const expiryColor = (reason: string) =>
    reason === 'expired' ? Colors.red : reason === 'expiring_soon' ? Colors.yellow : Colors.muted;

  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>

      {/* Stats del mes */}
      <View style={cobroStyles.statsRow}>
        <View style={[cobroStyles.statCard, { borderColor: Colors.green }]}>
          <Text style={cobroStyles.statLabel}>Cobrado este mes</Text>
          <Text style={[cobroStyles.statValue, { color: Colors.green }]}>{cobradoMes.toFixed(2).replace('.', ',')}€</Text>
        </View>
        <View style={[cobroStyles.statCard, { borderColor: pending.length > 0 ? Colors.yellow : Colors.border }]}>
          <Text style={cobroStyles.statLabel}>Pendiente</Text>
          <Text style={[cobroStyles.statValue, { color: pending.length > 0 ? Colors.yellow : Colors.muted }]}>
            {pendienteTotal.toFixed(2).replace('.', ',')}€
          </Text>
        </View>
      </View>

      {/* Alertas de vencimiento */}
      {!expiringLoading && expiring.length > 0 && (
        <>
          <View style={panelStyles.sectionHeader}>
            <Text style={panelStyles.sectionTitle}>⚠️ Requieren atención ({expiring.length})</Text>
          </View>
          {expiring.map(m => (
            <View key={m.id} style={cobroStyles.alertCard}>
              <View style={[cobroStyles.alertAvatar, { backgroundColor: m.avatar_color }]}>
                <Text style={cobroStyles.alertAvatarText}>{m.avatar_initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cobroStyles.alertName}>{m.name}</Text>
                <Text style={cobroStyles.alertPlan}>{m.plan}</Text>
                <Text style={[cobroStyles.alertReason, { color: expiryColor(m.reason) }]}>
                  {expiryLabel(m)}
                </Text>
              </View>
              <TouchableOpacity
                style={cobroStyles.genBtn}
                onPress={() => {
                  setNfMemberId(m.id);
                  setNfPlan(m.plan);
                  setShowNuevaFactura(true);
                }}
              >
                <Text style={cobroStyles.genBtnText}>+ Factura</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Nueva factura */}
      <TouchableOpacity
        style={cobroStyles.nuevaBtn}
        onPress={() => setShowNuevaFactura(v => !v)}
      >
        <Text style={cobroStyles.nuevaBtnText}>{showNuevaFactura ? '✕ Cancelar' : '+ Nueva factura'}</Text>
      </TouchableOpacity>

      {showNuevaFactura && (
        <View style={cobroStyles.nuevaCard}>
          <Text style={cobroStyles.nuevaLabel}>MIEMBRO</Text>
          <TouchableOpacity style={cobroStyles.pickerBtn} onPress={() => setShowMemberPicker(true)}>
            <Text style={[cobroStyles.pickerText, !selectedMember && { color: Colors.muted }]}>
              {selectedMember ? selectedMember.name : 'Seleccionar miembro...'}
            </Text>
            <Text style={{ color: Colors.muted }}>▾</Text>
          </TouchableOpacity>

          <Text style={[cobroStyles.nuevaLabel, { marginTop: 10 }]}>CONCEPTO / PLAN</Text>
          <TextInput
            style={cobroStyles.input}
            placeholder="Ej: Cuota mensual"
            placeholderTextColor={Colors.muted}
            value={nfPlan}
            onChangeText={setNfPlan}
          />

          <Text style={[cobroStyles.nuevaLabel, { marginTop: 10 }]}>IMPORTE (€)</Text>
          <TextInput
            style={cobroStyles.input}
            placeholder="0,00"
            placeholderTextColor={Colors.muted}
            keyboardType="decimal-pad"
            value={nfAmount}
            onChangeText={setNfAmount}
          />

          <Text style={[cobroStyles.nuevaLabel, { marginTop: 10 }]}>MÉTODO DE PAGO</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['efectivo', 'tarjeta'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[cobroStyles.payChip, nfPayMethod === m && cobroStyles.payChipActive]}
                onPress={() => setNfPayMethod(m)}
              >
                <Text style={[cobroStyles.payChipText, nfPayMethod === m && cobroStyles.payChipTextActive]}>
                  {m === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[cobroStyles.createBtn, nfBusy && { opacity: 0.6 }]}
            onPress={() => handleCreateInvoice()}
            disabled={nfBusy}
          >
            <Text style={cobroStyles.createBtnText}>{nfBusy ? 'Creando...' : 'Crear factura'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pendientes */}
      {pending.length > 0 && (
        <>
          <View style={panelStyles.sectionHeader}>
            <Text style={panelStyles.sectionTitle}>Pendientes de cobro ({pending.length})</Text>
          </View>
          {pending.map(p => (
            <View key={p.id} style={invRowStyles.row}>
              <View style={invRowStyles.icon}><Text style={{ fontSize: 18 }}>🕐</Text></View>
              <View style={invRowStyles.info}>
                <Text style={invRowStyles.num}>{p.member_name}</Text>
                <Text style={invRowStyles.meta}>{p.plan_name} · {p.date}</Text>
                {p.payment_method && (
                  <Text style={invRowStyles.meta}>{p.payment_method === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={invRowStyles.amount}>{p.amount.toFixed(2).replace('.', ',')}€</Text>
                <TouchableOpacity style={cobroStyles.pagarBtn} onPress={() => handleMarkPaid(p.id, p.member_name)}>
                  <Text style={cobroStyles.pagarText}>Cobrada ✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Historial cobros */}
      {paid.length > 0 && (
        <>
          <View style={panelStyles.sectionHeader}>
            <Text style={panelStyles.sectionTitle}>Historial</Text>
          </View>
          {paid.map(c => (
            <View key={c.id} style={invRowStyles.row}>
              <View style={invRowStyles.icon}><Text style={{ fontSize: 18 }}>✅</Text></View>
              <View style={invRowStyles.info}>
                <Text style={invRowStyles.num}>{c.member_name}</Text>
                <Text style={invRowStyles.meta}>{c.plan_name} · {c.date}</Text>
                {c.payment_method && (
                  <Text style={invRowStyles.meta}>{c.payment_method === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta'}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={invRowStyles.amount}>{c.amount.toFixed(2).replace('.', ',')}€</Text>
                <Badge label="Cobrada" variant="green" small />
              </View>
            </View>
          ))}
        </>
      )}

      {pending.length === 0 && paid.length === 0 && !loading && (
        <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', marginTop: 32 }}>
          Sin facturas aún
        </Text>
      )}

      {/* Member picker modal */}
      <Modal visible={showMemberPicker} transparent animationType="slide">
        <TouchableOpacity style={cobroStyles.modalOverlay} activeOpacity={1} onPress={() => setShowMemberPicker(false)}>
          <View style={cobroStyles.modalSheet}>
            <Text style={cobroStyles.modalTitle}>Seleccionar miembro</Text>
            <ScrollView>
              {allMembers.filter(m => !m.isPendingInvite).map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={cobroStyles.memberItem}
                  onPress={() => { setNfMemberId(m.id); setNfPlan(m.plan); setShowMemberPicker(false); }}
                >
                  <View style={[cobroStyles.memberAvatar, { backgroundColor: m.avatar_color }]}>
                    <Text style={cobroStyles.memberAvatarText}>{m.avatar_initials}</Text>
                  </View>
                  <View>
                    <Text style={cobroStyles.memberName}>{m.name}</Text>
                    <Text style={cobroStyles.memberPlan}>{m.plan}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

// ─── Admin Chat Panel ─────────────────────────────────────────────────────────

type AdminChatTab = 'broadcast' | 'dms';

interface ChatMsg {
  id: string;
  text: string;
  sender_id: string;
  sender_name: string;
  sender_initials: string;
  sender_color: string;
  created_at: string;
}

interface ConvItem {
  id: string;
  athlete_id: string;
  athlete_name: string;
  athlete_initials: string;
  athlete_color: string;
  last_preview: string;
  last_at: string;
  unread_admin: number;
}

function AdminChatPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  const { session } = useAuth();
  const [chatTab, setChatTab] = useState<AdminChatTab>('broadcast');
  const [broadcasts, setBroadcasts] = useState<ChatMsg[]>([]);
  const [bInput, setBInput] = useState('');
  const [bcLoading, setBcLoading] = useState(true);
  const [conversations, setConversations] = useState<ConvItem[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [activeDM, setActiveDM] = useState<ConvItem | null>(null);
  const [dmMsgs, setDmMsgs] = useState<ChatMsg[]>([]);
  const [dmLoading, setDmLoading] = useState(false);
  const [dmInput, setDmInput] = useState('');
  const bcScroll = useRef<ScrollView>(null);
  const dmScroll = useRef<ScrollView>(null);

  const fetchBroadcasts = useCallback(async () => {
    setBcLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('id, text, sender_id, created_at, profiles!messages_sender_id_fkey(name, avatar_initials, avatar_color)')
      .eq('is_broadcast', true)
      .order('created_at');
    setBroadcasts(((data || []) as any[]).map(m => ({
      id: m.id, text: m.text, sender_id: m.sender_id,
      sender_name: m.profiles?.name ?? 'Admin',
      sender_initials: m.profiles?.avatar_initials ?? 'A',
      sender_color: m.profiles?.avatar_color ?? Colors.orange,
      created_at: m.created_at,
    })));
    setBcLoading(false);
  }, []);

  const fetchConversations = useCallback(async () => {
    setConvLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('id, athlete_id, last_preview, last_at, unread_admin, profiles!conversations_athlete_id_fkey(name, avatar_initials, avatar_color)')
      .order('last_at', { ascending: false });
    setConversations(((data || []) as any[]).map(c => ({
      id: c.id,
      athlete_id: c.athlete_id,
      athlete_name: c.profiles?.name ?? '—',
      athlete_initials: c.profiles?.avatar_initials ?? '?',
      athlete_color: c.profiles?.avatar_color ?? Colors.muted,
      last_preview: c.last_preview ?? '',
      last_at: c.last_at,
      unread_admin: c.unread_admin ?? 0,
    })));
    setConvLoading(false);
  }, []);

  const fetchDMMessages = useCallback(async (convId: string) => {
    setDmLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('id, text, sender_id, created_at, profiles!messages_sender_id_fkey(name, avatar_initials, avatar_color)')
      .eq('conversation_id', convId)
      .order('created_at');
    setDmMsgs(((data || []) as any[]).map(m => ({
      id: m.id, text: m.text, sender_id: m.sender_id,
      sender_name: m.profiles?.name ?? '—',
      sender_initials: m.profiles?.avatar_initials ?? '?',
      sender_color: m.profiles?.avatar_color ?? Colors.muted,
      created_at: m.created_at,
    })));
    await supabase.from('conversations').update({ unread_admin: 0 }).eq('id', convId);
    setDmLoading(false);
  }, []);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);
  useEffect(() => { if (chatTab === 'dms') fetchConversations(); }, [chatTab, fetchConversations]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const sendBroadcast = async () => {
    if (!bInput.trim() || !session?.user.id) return;
    const text = bInput.trim();
    setBInput('');
    const { error } = await supabase.from('messages').insert({
      sender_id: session.user.id, text, is_broadcast: true, conversation_id: null,
    });
    if (!error) {
      fetchBroadcasts();
      showToast('📢 Enviado a todos los atletas', 'success');
      setTimeout(() => bcScroll.current?.scrollToEnd(), 200);
    } else {
      showToast('Error al enviar', 'error');
    }
  };

  const sendDM = async () => {
    if (!dmInput.trim() || !session?.user.id || !activeDM) return;
    const text = dmInput.trim();
    setDmInput('');
    const { error } = await supabase.from('messages').insert({
      sender_id: session.user.id, text, is_broadcast: false, conversation_id: activeDM.id,
    });
    if (!error) {
      await supabase.from('conversations').update({
        last_preview: text.slice(0, 100),
        last_at: new Date().toISOString(),
      }).eq('id', activeDM.id);
      fetchDMMessages(activeDM.id);
      setTimeout(() => dmScroll.current?.scrollToEnd(), 200);
    }
  };

  const openDM = (conv: ConvItem) => {
    setActiveDM(conv);
    fetchDMMessages(conv.id);
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread_admin, 0);

  return (
    <View style={styles.flex}>
      <View style={chatStyles.tabBar}>
        <TouchableOpacity style={[chatStyles.tabBtn, chatTab === 'broadcast' && chatStyles.tabBtnActive]} onPress={() => setChatTab('broadcast')}>
          <Text style={[chatStyles.tabText, chatTab === 'broadcast' && chatStyles.tabTextActive]}>📢 Anuncio general</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[chatStyles.tabBtn, chatTab === 'dms' && chatStyles.tabBtnActive]} onPress={() => setChatTab('dms')}>
          <Text style={[chatStyles.tabText, chatTab === 'dms' && chatStyles.tabTextActive]}>
            💬 Mensajes {totalUnread > 0 && <Text style={chatStyles.badge}> {totalUnread} </Text>}
          </Text>
        </TouchableOpacity>
      </View>

      {chatTab === 'broadcast' && (
        <>
          <View style={chatStyles.channelInfo}>
            <Text style={chatStyles.channelInfoText}>📢 Canal general — visible para todos los atletas</Text>
          </View>
          {bcLoading ? (
            <ActivityIndicator color={Colors.orange} style={{ flex: 1 }} />
          ) : (
            <ScrollView ref={bcScroll} style={chatStyles.msgList} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {broadcasts.map(msg => {
                const mine = msg.sender_id === session?.user.id;
                if (mine) {
                  return (
                    <View key={msg.id} style={chatStyles.broadcastWrap}>
                      <Text style={chatStyles.broadcastLabel}>📢 Tú (Admin)</Text>
                      <View style={chatStyles.broadcastBubble}>
                        <Text style={chatStyles.broadcastText}>{msg.text}</Text>
                      </View>
                      <Text style={chatStyles.time}>{fmtTime(msg.created_at)}</Text>
                    </View>
                  );
                }
                return (
                  <View key={msg.id} style={chatStyles.theirMsg}>
                    <Text style={chatStyles.sender}>{msg.sender_name}</Text>
                    <View style={chatStyles.theirBubble}>
                      <Text style={chatStyles.theirText}>{msg.text}</Text>
                    </View>
                    <Text style={chatStyles.time}>{fmtTime(msg.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.input}
              placeholder="Anuncio para todos los atletas..."
              placeholderTextColor={Colors.muted}
              value={bInput}
              onChangeText={setBInput}
              onSubmitEditing={sendBroadcast}
              returnKeyType="send"
            />
            <TouchableOpacity style={chatStyles.sendBtn} onPress={sendBroadcast}>
              <Text style={chatStyles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {chatTab === 'dms' && !activeDM && (
        <>
          {convLoading ? (
            <ActivityIndicator color={Colors.orange} style={{ flex: 1 }} />
          ) : conversations.length === 0 ? (
            <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 14, textAlign: 'center', marginTop: 40 }}>Sin conversaciones aún</Text>
          ) : (
            <ScrollView>
              {conversations.map(conv => (
                <TouchableOpacity key={conv.id} style={dmListStyles.item} onPress={() => openDM(conv)}>
                  <View style={[dmListStyles.avatar, { backgroundColor: conv.athlete_color }]}>
                    <Text style={dmListStyles.avatarText}>{conv.athlete_initials}</Text>
                    {conv.unread_admin > 0 && <View style={dmListStyles.unreadDot} />}
                  </View>
                  <View style={dmListStyles.info}>
                    <Text style={dmListStyles.name}>{conv.athlete_name}</Text>
                    <Text style={dmListStyles.preview} numberOfLines={1}>{conv.last_preview}</Text>
                  </View>
                  <View style={dmListStyles.meta}>
                    {conv.unread_admin > 0 && (
                      <View style={dmListStyles.badge}>
                        <Text style={dmListStyles.badgeText}>{conv.unread_admin}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {chatTab === 'dms' && activeDM && (
        <>
          <View style={chatStyles.convHeader}>
            <TouchableOpacity onPress={() => { setActiveDM(null); fetchConversations(); }}>
              <Text style={chatStyles.backBtn}>‹</Text>
            </TouchableOpacity>
            <View style={[chatStyles.convAvatar, { backgroundColor: activeDM.athlete_color }]}>
              <Text style={chatStyles.convAvatarText}>{activeDM.athlete_initials}</Text>
            </View>
            <View>
              <Text style={chatStyles.convName}>{activeDM.athlete_name}</Text>
              <Text style={chatStyles.convSub}>Atleta</Text>
            </View>
          </View>

          {dmLoading ? (
            <ActivityIndicator color={Colors.orange} style={{ flex: 1 }} />
          ) : (
            <ScrollView ref={dmScroll} style={chatStyles.msgList} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {dmMsgs.length === 0 && (
                <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 13, textAlign: 'center', marginTop: 40 }}>Sin mensajes aún</Text>
              )}
              {dmMsgs.map(msg => {
                const mine = msg.sender_id === session?.user.id;
                return (
                  <View key={msg.id} style={[chatStyles.msgRow, mine ? chatStyles.msgMine : chatStyles.msgTheirs]}>
                    <View style={[chatStyles.bubble, mine ? chatStyles.bubbleMine : chatStyles.bubbleTheirs]}>
                      <Text style={[chatStyles.bubbleText, mine && chatStyles.bubbleTextMine]}>{msg.text}</Text>
                    </View>
                    <Text style={chatStyles.time}>{fmtTime(msg.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.input}
              placeholder="Responder..."
              placeholderTextColor={Colors.muted}
              value={dmInput}
              onChangeText={setDmInput}
              onSubmitEditing={sendDM}
              returnKeyType="send"
            />
            <TouchableOpacity style={chatStyles.sendBtn} onPress={sendDM}>
              <Text style={chatStyles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Nueva Clase Panel ────────────────────────────────────────────────────────

function NuevaClasePanel({ showToast, onCreated, onBack }: { showToast: (m: string, t: any) => void; onCreated: () => void; onBack?: () => void }) {
  const [name, setName] = useState('WOD CrossFit');
  const [time, setTime] = useState('07:00');
  const [duration, setDuration] = useState('60 min');
  const [coach, setCoach] = useState('');
  const [capacity, setCapacity] = useState('16');
  const [wod, setWod] = useState('');
  const [date, setDate] = useState(TODAY_ISO);
  const [repeat, setRepeat] = useState<'once' | 'week'>('once');
  const [busy, setBusy] = useState(false);

  const isoFromDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const adjustDate = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(isoFromDate(d));
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const CLASS_TYPES = ['WOD CrossFit', 'Halterofilia', 'Gimnasia', 'Open Box', 'Endurance', 'Kids'];

  const handleCreate = async () => {
    if (!name.trim() || !time.trim() || !coach.trim()) {
      showToast('Nombre, hora y coach son obligatorios', 'error');
      return;
    }
    setBusy(true);
    try {
      const base = {
        name: name.trim(),
        time: time.trim(),
        duration: duration.trim() || '60 min',
        coach: coach.trim(),
        capacity: parseInt(capacity, 10) || 16,
        wod: wod.trim() || null,
      };

      let rows;
      if (repeat === 'week') {
        const d = new Date(date + 'T00:00:00');
        const dow = d.getDay();
        const mon = new Date(d);
        mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
        rows = Array.from({ length: 5 }, (_, i) => {
          const day = new Date(mon);
          day.setDate(mon.getDate() + i);
          return { ...base, date: isoFromDate(day) };
        });
      } else {
        rows = [{ ...base, date }];
      }

      const { error } = await supabase.from('classes').insert(rows);
      if (error) throw error;
      showToast(repeat === 'week' ? '✅ 5 clases creadas (lun-vie)' : '✅ Clase creada', 'success');
      onCreated();
    } catch {
      showToast('Error al crear la clase', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ marginBottom: 12 }}>
          <Text style={{ color: Colors.orange, fontFamily: Fonts.bodySemiBold, fontSize: 14 }}>‹ Volver a clases</Text>
        </TouchableOpacity>
      )}
      <View style={nuevaStyles.card}>

        <Text style={nuevaStyles.sectionLabel}>Tipo de clase</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CLASS_TYPES.map(ct => (
              <TouchableOpacity
                key={ct}
                style={[nuevaStyles.typeChip, name === ct && nuevaStyles.typeChipActive]}
                onPress={() => setName(ct)}
              >
                <Text style={[nuevaStyles.typeChipText, name === ct && nuevaStyles.typeChipTextActive]}>{ct}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <FormField label="Nombre personalizado" input={
          <TextInput style={nuevaStyles.input} placeholder="Ej: WOD CrossFit" placeholderTextColor={Colors.muted}
            value={name} onChangeText={setName} />
        } />

        <View style={nuevaStyles.row}>
          <View style={nuevaStyles.half}>
            <FormField label="Hora inicio" input={
              <TextInput style={nuevaStyles.input} placeholder="07:00" placeholderTextColor={Colors.muted}
                value={time} onChangeText={setTime} />
            } />
          </View>
          <View style={nuevaStyles.half}>
            <FormField label="Duración" input={
              <TextInput style={nuevaStyles.input} placeholder="60 min" placeholderTextColor={Colors.muted}
                value={duration} onChangeText={setDuration} />
            } />
          </View>
        </View>

        <FormField label="Coach" input={
          <TextInput style={nuevaStyles.input} placeholder="Nombre del coach" placeholderTextColor={Colors.muted}
            value={coach} onChangeText={setCoach} />
        } />

        <View style={nuevaStyles.row}>
          <View style={nuevaStyles.half}>
            <FormField label="Plazas máx." input={
              <TextInput style={nuevaStyles.input} placeholder="16" placeholderTextColor={Colors.muted}
                value={capacity} onChangeText={setCapacity} keyboardType="numeric" />
            } />
          </View>
          <View style={nuevaStyles.half}>
            <Text style={nuevaStyles.label}>Fecha</Text>
            <View style={nuevaStyles.dateRow}>
              <TouchableOpacity style={nuevaStyles.dateBtn} onPress={() => adjustDate(-1)}>
                <Text style={nuevaStyles.dateBtnText}>‹</Text>
              </TouchableOpacity>
              <Text style={nuevaStyles.dateText}>{fmtDate(date)}</Text>
              <TouchableOpacity style={nuevaStyles.dateBtn} onPress={() => adjustDate(1)}>
                <Text style={nuevaStyles.dateBtnText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={nuevaStyles.label}>Repetir</Text>
        <View style={nuevaStyles.repeatRow}>
          <TouchableOpacity
            style={[nuevaStyles.repeatBtn, repeat === 'once' && nuevaStyles.repeatBtnActive]}
            onPress={() => setRepeat('once')}
          >
            <Text style={[nuevaStyles.repeatBtnText, repeat === 'once' && nuevaStyles.repeatBtnTextActive]}>Solo esta fecha</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[nuevaStyles.repeatBtn, repeat === 'week' && nuevaStyles.repeatBtnActive]}
            onPress={() => setRepeat('week')}
          >
            <Text style={[nuevaStyles.repeatBtnText, repeat === 'week' && nuevaStyles.repeatBtnTextActive]}>Lun–Vie (5 días)</Text>
          </TouchableOpacity>
        </View>

        <FormField label="WOD (opcional)" input={
          <TextInput
            style={[nuevaStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
            placeholder="Describe el entrenamiento..."
            placeholderTextColor={Colors.muted}
            value={wod}
            onChangeText={setWod}
            multiline
          />
        } />

        <TouchableOpacity
          style={[nuevaStyles.createBtn, busy && { opacity: 0.6 }]}
          onPress={handleCreate}
          disabled={busy}
        >
          <Text style={nuevaStyles.createBtnText}>{busy ? 'Creando...' : 'Crear clase'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MemberInvoices({ memberId }: { memberId: string }) {
  const { invoices, loading } = useInvoices(memberId);
  if (loading) return <ActivityIndicator color={Colors.orange} size="small" style={{ marginTop: 8 }} />;
  if (!invoices.length) return <Text style={{ color: Colors.muted, fontFamily: Fonts.body, fontSize: 12, marginTop: 4 }}>Sin facturas</Text>;
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      {invoices.slice(0, 4).map(inv => (
        <View key={inv.id} style={memInvStyles.row}>
          <View style={{ flex: 1 }}>
            <Text style={memInvStyles.num}>{inv.number}</Text>
            <Text style={memInvStyles.meta}>{inv.date} · {inv.plan_name}</Text>
          </View>
          <Text style={memInvStyles.amount}>{inv.amount.toFixed(2).replace('.', ',')}€</Text>
          <Badge label={inv.paid ? 'Pagada' : 'Pendiente'} variant={inv.paid ? 'green' : 'yellow'} small />
        </View>
      ))}
    </View>
  );
}

function FormField({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={nuevaStyles.label}>{label}</Text>
      {input}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  flex: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  bottomItem: { flex: 1, alignItems: 'center', gap: 3 },
  bottomActiveLine: {
    position: 'absolute', top: -8, width: 24, height: 3,
    borderRadius: 2, backgroundColor: Colors.orange,
  },
  bottomIcon: { fontSize: 22 },
  bottomLabel: { fontSize: 10, fontFamily: Fonts.body, color: Colors.muted },
  bottomLabelActive: { color: Colors.orange, fontFamily: Fonts.bodySemiBold },
});

const clsHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.headingXBold, fontSize: 20, color: Colors.white },
  nuevaBtn: {
    backgroundColor: Colors.orange, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8,
  },
  nuevaBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: '#fff' },
});

const memInvStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  num: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.white },
  meta: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.body, marginTop: 1 },
  amount: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.white },
});

const panelStyles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  sectionHeader: { paddingVertical: 12 },
  sectionTitle: { fontFamily: Fonts.heading, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.muted },
});

const clsStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  timeBlock: { alignItems: 'center', minWidth: 48 },
  cardTime: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.orange, lineHeight: 24 },
  cardDuration: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.body, marginTop: 2 },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 2 },
  coachText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  rightCol: { alignItems: 'flex-end', gap: 2 },
  spotsText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white },
  fullLabel: { fontSize: 10, color: Colors.red, fontFamily: Fonts.bodySemiBold },
  slotsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SLOT_GAP,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12,
  },
  slotEmpty: {
    width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: SLOT_RADIUS,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  slotGhost: {
    width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: SLOT_RADIUS,
    borderWidth: 1, borderColor: Colors.orange,
    backgroundColor: Colors.orangeGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  slotGhostText: { fontSize: 13, color: Colors.orange, fontFamily: Fonts.bodySemiBold },
  cardActions: {
    flexDirection: 'row', gap: 8, marginTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10,
  },
  editBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  editBtnText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.white },
  deleteBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.red,
  },
  deleteBtnText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.red },
  confirmRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmText: { flex: 1, fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  confirmYes: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.red },
  confirmYesText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: '#fff' },
  confirmNo: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  confirmNoText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.muted },
});

const memStyles = StyleSheet.create({
  search: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 10, paddingHorizontal: 12, color: Colors.white, fontFamily: Fonts.body, fontSize: 14,
  },
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, marginBottom: 8, overflow: 'hidden',
  },
  row: { padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 16, color: '#fff' },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 2 },
  plan: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  addBtn: { backgroundColor: Colors.orange, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 13 },
});

const expandStyles = StyleSheet.create({
  body: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
    backgroundColor: Colors.surface2,
  },
  detail: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  sectionLabel: {
    fontSize: 11, color: Colors.muted, fontFamily: Fonts.bodySemiBold,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tariffRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tariffChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  tariffChipSel: { borderColor: Colors.orange, backgroundColor: Colors.orangeGlow },
  tariffChipText: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.muted },
  tariffChipTextSel: { color: Colors.orange },
  tariffChipPrice: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.white, marginTop: 2 },
  remainingInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 16,
    marginTop: 6, width: 100,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  saveBtn: {
    flex: 1, backgroundColor: Colors.orange, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  saveBtnText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 12 },
  deleteBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.red, alignItems: 'center',
  },
  deleteBtnText: { fontFamily: Fonts.bodySemiBold, color: Colors.red, fontSize: 12 },
});

const cobroStyles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1,
    borderRadius: 12, padding: 14,
  },
  statLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.bodySemiBold, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontFamily: Fonts.heading, fontSize: 22 },
  alertCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.yellow,
    borderRadius: 10, padding: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  alertAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  alertAvatarText: { fontFamily: Fonts.headingXBold, fontSize: 12, color: '#fff' },
  alertName: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white },
  alertPlan: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  alertReason: { fontSize: 11, fontFamily: Fonts.bodySemiBold, marginTop: 1 },
  genBtn: {
    backgroundColor: Colors.orangeGlow, borderWidth: 1, borderColor: Colors.orange,
    borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7,
  },
  genBtnText: { fontSize: 12, color: Colors.orange, fontFamily: Fonts.bodySemiBold },
  nuevaBtn: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.orange,
    borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12,
  },
  nuevaBtnText: { color: Colors.orange, fontFamily: Fonts.bodySemiBold, fontSize: 13 },
  nuevaCard: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 14,
  },
  nuevaLabel: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.bodySemiBold, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 10, paddingHorizontal: 12,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 14,
  },
  pickerBtn: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 10, paddingHorizontal: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerText: { color: Colors.white, fontFamily: Fonts.body, fontSize: 14 },
  createBtn: { backgroundColor: Colors.orange, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 },
  createBtnText: { color: '#fff', fontFamily: Fonts.bodySemiBold, fontSize: 14 },
  pagarBtn: {
    backgroundColor: '#052e16', borderWidth: 1, borderColor: Colors.green,
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5,
  },
  pagarText: { fontSize: 11, color: Colors.green, fontFamily: Fonts.bodySemiBold },
  payChip: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2,
  },
  payChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  payChipText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.muted },
  payChipTextActive: { color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, maxHeight: '70%',
  },
  modalTitle: { fontFamily: Fonts.bodySemiBold, fontSize: 15, color: Colors.white, marginBottom: 14 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontFamily: Fonts.headingXBold, fontSize: 12, color: '#fff' },
  memberName: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white },
  memberPlan: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
});

const invRowStyles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 12, paddingHorizontal: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  icon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  num: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white, marginBottom: 2 },
  meta: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  amount: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.white },
});

const nuevaStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16,
  },
  sectionLabel: {
    fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  label: {
    fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: 10, paddingHorizontal: 12,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, overflow: 'hidden',
  },
  dateBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  dateBtnText: { color: Colors.orange, fontSize: 20, fontFamily: Fonts.heading },
  dateText: { flex: 1, textAlign: 'center', color: Colors.white, fontFamily: Fonts.body, fontSize: 12 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2,
  },
  typeChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  typeChipText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.muted },
  typeChipTextActive: { color: '#fff' },
  repeatRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  repeatBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2,
  },
  repeatBtnActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  repeatBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.muted },
  repeatBtnTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: Colors.orange, borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 4,
  },
  createBtnText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 14 },
});

const chatStyles = StyleSheet.create({
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.orange },
  tabText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.muted },
  tabTextActive: { color: Colors.orange },
  badge: { backgroundColor: Colors.orange, color: '#fff', borderRadius: 10, fontSize: 10, paddingHorizontal: 5 },
  channelInfo: { padding: 10, paddingHorizontal: 16, backgroundColor: Colors.surface2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  channelInfoText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  msgList: { flex: 1 },
  inputBar: {
    flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, paddingHorizontal: 12,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 14,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 18 },
  broadcastWrap: { gap: 4 },
  broadcastLabel: { fontSize: 10, color: Colors.orange, fontFamily: Fonts.bodySemiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  broadcastBubble: { backgroundColor: '#1a0800', borderWidth: 1, borderColor: Colors.orange, borderRadius: 12, padding: 14 },
  broadcastText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
  seenText: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.body, textAlign: 'center' },
  theirMsg: { gap: 3, alignSelf: 'flex-start' },
  sender: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.bodySemiBold, paddingHorizontal: 4 },
  theirBubble: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10 },
  theirText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
  time: { fontSize: 10, color: Colors.muted, fontFamily: Fonts.body, paddingHorizontal: 4 },
  convHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 16,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { color: Colors.orange, fontSize: 22, lineHeight: 24, paddingHorizontal: 4 },
  convAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { fontFamily: Fonts.headingXBold, fontSize: 13, color: '#fff' },
  convName: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white },
  convSub: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  msgRow: { gap: 3 },
  msgMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, maxWidth: 260 },
  bubbleMine: { backgroundColor: Colors.orange, borderTopRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 13, color: Colors.white, fontFamily: Fonts.body, lineHeight: 19 },
  bubbleTextMine: { color: '#fff' },
});

const adminDateStyles = StyleSheet.create({
  scroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  content: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, flexDirection: 'row' },
  pill: {
    alignItems: 'center', minWidth: 48, paddingHorizontal: 4, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2,
  },
  pillActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  pillDay: { fontSize: 10, fontFamily: Fonts.bodySemiBold, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  pillNum: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.white, lineHeight: 22 },
  pillTextActive: { color: '#fff' },
});

const adminTimeStyles = StyleSheet.create({
  scroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  content: { paddingHorizontal: 16, paddingVertical: 14, gap: 8, flexDirection: 'row' },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2 },
  pillActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  pillText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.muted },
  pillTextActive: { color: '#fff' },
});

const addStyles = StyleSheet.create({
  backRow: { marginBottom: 16 },
  backText: { color: Colors.orange, fontFamily: Fonts.bodySemiBold, fontSize: 14 },
  formTitle: { fontFamily: Fonts.headingXBold, fontSize: 22, color: Colors.white, marginBottom: 18 },
  label: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 15, marginBottom: 4,
  },
  tariffGrid: { gap: 10, marginTop: 4 },
  tariffCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14 },
  tariffCardSel: { borderColor: Colors.orange, backgroundColor: Colors.orangeGlow },
  tariffBadge: { alignSelf: 'flex-end', backgroundColor: Colors.orange, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  tariffBadgeText: { fontSize: 10, fontFamily: Fonts.bodySemiBold, color: '#fff' },
  tariffName: { fontFamily: Fonts.headingXBold, fontSize: 18, color: Colors.white, marginBottom: 2 },
  tariffDesc: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body, marginBottom: 8 },
  tariffPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 10 },
  tariffCurrency: { fontSize: 16, color: Colors.muted, fontFamily: Fonts.heading, lineHeight: 32 },
  tariffPrice: { fontSize: 36, fontFamily: Fonts.headingXBold, color: Colors.white, lineHeight: 38 },
  tariffUnit: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body, lineHeight: 24 },
  tariffFeature: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body, marginTop: 3 },
  sendBtn: { backgroundColor: Colors.orange, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  sendBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: 16, color: '#fff' },
});

const editClsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderColor: Colors.border, padding: 24, paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontFamily: Fonts.heading, fontSize: 22, color: Colors.white, marginBottom: 20 },
  label: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: Colors.white, fontFamily: Fonts.body, fontSize: 15, marginBottom: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontFamily: Fonts.bodySemiBold, color: Colors.muted, fontSize: 14 },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.orange, alignItems: 'center' },
  saveText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 14 },
});

const lbStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  img: { width: 280, height: 280, borderRadius: 10 },
  hint: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16, fontFamily: Fonts.body },
});

const dmListStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 17, color: '#fff' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.orange, borderWidth: 2, borderColor: Colors.black },
  info: { flex: 1, overflow: 'hidden' },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 2 },
  preview: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  meta: { alignItems: 'flex-end' },
  badge: { backgroundColor: Colors.orange, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontSize: 10, fontFamily: Fonts.bodySemiBold, color: '#fff' },
});
