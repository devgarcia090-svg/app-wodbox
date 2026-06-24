import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Badge } from '../../components/common/Badge';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import { CLASSES_TODAY, MEMBERS, INVOICES, ADMIN_DMS } from '../../data/mockData';

type AdminTab = 'clases' | 'miembros' | 'cobros' | 'facturas' | 'chat' | 'nueva';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('clases');
  const { toast, showToast } = useToast();

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'clases', label: 'Clases hoy' },
    { key: 'miembros', label: 'Miembros' },
    { key: 'cobros', label: 'Cobros' },
    { key: 'facturas', label: 'Facturas' },
    { key: 'chat', label: 'Chat' },
    { key: 'nueva', label: '+ Nueva clase' },
  ];

  return (
    <View style={styles.container}>
      {/* Admin header */}
      <View style={styles.adminHeader}>
        <Text style={styles.adminTitle}>CrossFit Murcia 🔥</Text>
        <Text style={styles.adminSub}>Panel de gestión · Miércoles 24 jun 2026</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Atletas activos" value="47" sub="+3 este mes" />
        <StatCard label="Clases hoy" value="5" sub="63 reservas" />
        <StatCard label="Ingresos junio" value="1.840€" sub="Objetivo: 2.100€" valueSize={24} />
        <StatCard label="Pagos pendientes" value="3" sub="Requieren acción" valueColor={Colors.yellow} subColor={Colors.yellow} />
      </View>

      {/* Tab scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.adminTab, activeTab === t.key && styles.adminTabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.adminTabText, activeTab === t.key && styles.adminTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Panels */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {activeTab === 'clases' && <ClasesPanel showToast={showToast} />}
        {activeTab === 'miembros' && <MiembrosPanel showToast={showToast} />}
        {activeTab === 'cobros' && <CobrosPanel showToast={showToast} />}
        {activeTab === 'facturas' && <FacturasPanel showToast={showToast} />}
        {activeTab === 'chat' && <AdminChatPanel showToast={showToast} />}
        {activeTab === 'nueva' && <NuevaClasePanel showToast={showToast} />}
      </KeyboardAvoidingView>

      <Toast {...toast} />
    </View>
  );
}

function StatCard({ label, value, sub, valueSize = 32, valueColor = Colors.orange, subColor = Colors.muted }: {
  label: string; value: string; sub: string; valueSize?: number; valueColor?: string; subColor?: string;
}) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { fontSize: valueSize, color: valueColor }]}>{value}</Text>
      <Text style={[statStyles.sub, { color: subColor }]}>{sub}</Text>
    </View>
  );
}

function ClasesPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
      {CLASSES_TODAY.map(cls => {
        const pct = Math.round((cls.enrolled / cls.capacity) * 100);
        const fillColor = pct >= 90 ? Colors.red : pct >= 60 ? Colors.yellow : Colors.green;
        return (
          <View key={cls.id} style={clsStyles.row}>
            <View style={clsStyles.info}>
              <Text style={clsStyles.name}>{cls.name} · {cls.time}</Text>
              <View style={clsStyles.meta}>
                <Text style={clsStyles.metaText}>{cls.coach}</Text>
                <Text style={[clsStyles.metaText, pct >= 100 && { color: Colors.red }]}>
                  {cls.enrolled}/{cls.capacity}{pct >= 100 ? ' LLENA' : ''}
                </Text>
              </View>
              <View style={clsStyles.bar}>
                <View style={[clsStyles.fill, { width: `${pct}%` as any, backgroundColor: fillColor }]} />
              </View>
            </View>
            <View style={clsStyles.actions}>
              <TouchableOpacity style={clsStyles.iconBtn} onPress={() => showToast('Lista abierta', 'success')}>
                <Text>👥</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[clsStyles.iconBtn, clsStyles.ghostBtn]} onPress={() => showToast('Editando', 'info')}>
                <Text>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function MiembrosPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  const [search, setSearch] = useState('');
  const filtered = MEMBERS.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
      <View style={{ marginBottom: 12 }}>
        <TextInput
          style={memStyles.search}
          placeholder="🔍 Buscar atleta..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {filtered.map(m => (
        <View key={m.id} style={memStyles.row}>
          <View style={[memStyles.avatar, { backgroundColor: m.color }]}>
            <Text style={memStyles.avatarText}>{m.initials}</Text>
          </View>
          <View style={memStyles.info}>
            <Text style={memStyles.name}>{m.name}</Text>
            <Text style={memStyles.plan}>{m.plan}</Text>
          </View>
          <Badge
            label={m.status === 'active' ? 'Activo' : m.status === 'pending' ? 'Pendiente' : 'Inactivo'}
            variant={m.status === 'active' ? 'green' : m.status === 'pending' ? 'yellow' : 'red'}
          />
        </View>
      ))}
      <TouchableOpacity style={memStyles.addBtn} onPress={() => showToast('Formulario de nuevo atleta', 'info')}>
        <Text style={memStyles.addBtnText}>+ Añadir atleta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CobrosPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
      <View style={cobroStyles.pendingBox}>
        <Text style={cobroStyles.pendingTitle}>⚠️ Pagos pendientes</Text>
        {[
          { name: 'Javier Ruiz', plan: 'Mensual · vencido 1 jun', amount: '40,00€' },
          { name: 'Rosa Torres', plan: 'Mensual · vencido 1 jun', amount: '40,00€' },
        ].map((p, i) => (
          <View key={i} style={[cobroStyles.pendingRow, i === 0 && cobroStyles.pendingRowBorder]}>
            <View>
              <Text style={cobroStyles.pendingName}>{p.name}</Text>
              <Text style={cobroStyles.pendingPlan}>{p.plan}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={cobroStyles.pendingAmount}>{p.amount}</Text>
              <TouchableOpacity style={cobroStyles.avisarBtn} onPress={() => showToast('Recordatorio enviado', 'success')}>
                <Text style={cobroStyles.avisarText}>Avisar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <View style={panelStyles.sectionHeader}>
        <Text style={panelStyles.sectionTitle}>Cobros recientes</Text>
      </View>
      {[
        { name: 'Carlos Martínez', date: '1 jun · Ilimitado', amount: '55,00€' },
        { name: 'Laura García', date: '1 jun · 3 días/semana', amount: '40,00€' },
        { name: 'Nuria Fernández', date: '1 jun · Ilimitado', amount: '55,00€' },
      ].map((c, i) => (
        <View key={i} style={invRowStyles.row}>
          <View style={invRowStyles.icon}><Text style={{ fontSize: 18 }}>💳</Text></View>
          <View style={invRowStyles.info}>
            <Text style={invRowStyles.num}>{c.name}</Text>
            <Text style={invRowStyles.meta}>{c.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={invRowStyles.amount}>{c.amount}</Text>
            <Badge label="Cobrado" variant="green" small />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function FacturasPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
      <View style={factStyles.diffBox}>
        <Text style={factStyles.diffTitle}>✨ Diferencial WodBox</Text>
        <Text style={factStyles.diffSub}>Genera facturas legales automáticamente. Cumplimiento VeriFactu incluido.</Text>
      </View>
      <View style={factStyles.actions}>
        <TouchableOpacity style={[factStyles.btn, factStyles.btnPrimary]} onPress={() => showToast('Generando factura...', 'info')}>
          <Text style={factStyles.btnPrimaryText}>+ Generar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[factStyles.btn, factStyles.btnSecondary]} onPress={() => showToast('Exportando...', 'info')}>
          <Text style={factStyles.btnSecondaryText}>📥 Exportar</Text>
        </TouchableOpacity>
      </View>
      {INVOICES.map(inv => (
        <View key={inv.id} style={invRowStyles.row}>
          <View style={invRowStyles.icon}><Text style={{ fontSize: 18 }}>🧾</Text></View>
          <View style={invRowStyles.info}>
            <Text style={invRowStyles.num}>{inv.number}</Text>
            <Text style={invRowStyles.meta}>{inv.member} · {inv.date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={invRowStyles.amount}>{inv.amount}</Text>
            <TouchableOpacity
              style={factStyles.pdfBtn}
              onPress={() => showToast('Descargando PDF', 'success')}
            >
              <Text style={factStyles.pdfBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      <Text style={factStyles.footer}>Numeración correlativa automática · IVA incluido · VeriFactu</Text>
    </ScrollView>
  );
}

type AdminChatTab = 'broadcast' | 'dms';

function AdminChatPanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  const [chatTab, setChatTab] = useState<AdminChatTab>('broadcast');
  const [broadcastMsgs, setBroadcastMsgs] = useState([
    { id: '1', text: '¡Buenos días equipo! 🔥 Hoy la clase de las 12:00 está completa. Plaza para las 18:00 disponible.', mine: true, time: '08:15', seen: 31 },
    { id: '2', text: '¿Alguien más para la clase de las 18:00? 🙋', mine: false, sender: 'Carlos Martínez', time: '10:32' },
    { id: '3', text: '¡Yo me apunto! Ya he reservado 👊', mine: false, sender: 'Ana Pérez', time: '10:34' },
  ]);
  const [bInput, setBInput] = useState('');
  const [activeDM, setActiveDM] = useState<string | null>(null);
  const [dmMsgs, setDmMsgs] = useState<Record<string, any[]>>({});
  const [dmInput, setDmInput] = useState('');

  const now = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const sendBroadcast = () => {
    if (!bInput.trim()) return;
    setBroadcastMsgs(prev => [...prev, { id: String(Date.now()), text: bInput.trim(), mine: true, time: now(), seen: 0 }]);
    setBInput('');
    showToast('📢 Enviado a todos los atletas', 'success');
  };

  const openDM = (id: string) => {
    setActiveDM(id);
    if (!dmMsgs[id]) {
      const dm = ADMIN_DMS.find(d => d.id === id)!;
      setDmMsgs(prev => ({ ...prev, [id]: dm.messages.map((m, i) => ({ id: String(i), text: m, mine: false, time: 'Hoy' })) }));
    }
  };

  const sendAdminDM = () => {
    if (!dmInput.trim() || !activeDM) return;
    setDmMsgs(prev => ({ ...prev, [activeDM]: [...(prev[activeDM] || []), { id: String(Date.now()), text: dmInput.trim(), mine: true, time: now() }] }));
    setDmInput('');
  };

  return (
    <View style={styles.flex}>
      <View style={chatStyles.tabBar}>
        <TouchableOpacity style={[chatStyles.tabBtn, chatTab === 'broadcast' && chatStyles.tabBtnActive]} onPress={() => setChatTab('broadcast')}>
          <Text style={[chatStyles.tabText, chatTab === 'broadcast' && chatStyles.tabTextActive]}>📢 Anuncio general</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[chatStyles.tabBtn, chatTab === 'dms' && chatStyles.tabBtnActive]} onPress={() => setChatTab('dms')}>
          <Text style={[chatStyles.tabText, chatTab === 'dms' && chatStyles.tabTextActive]}>💬 Mensajes <Text style={chatStyles.badge}>3</Text></Text>
        </TouchableOpacity>
      </View>

      {chatTab === 'broadcast' && (
        <>
          <View style={chatStyles.channelInfo}>
            <Text style={chatStyles.channelInfoText}>📢 Canal general — visible para todos los atletas</Text>
          </View>
          <ScrollView style={chatStyles.msgList} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {broadcastMsgs.map(msg => (
              <View key={msg.id}>
                {msg.mine ? (
                  <View style={chatStyles.broadcastWrap}>
                    <Text style={chatStyles.broadcastLabel}>📢 Tú (Admin)</Text>
                    <View style={chatStyles.broadcastBubble}>
                      <Text style={chatStyles.broadcastText}>{msg.text}</Text>
                    </View>
                    {msg.seen !== undefined && (
                      <Text style={chatStyles.seenText}>Visto por {msg.seen} atletas</Text>
                    )}
                  </View>
                ) : (
                  <View style={chatStyles.theirMsg}>
                    {msg.sender && <Text style={chatStyles.sender}>{msg.sender}</Text>}
                    <View style={chatStyles.theirBubble}>
                      <Text style={chatStyles.theirText}>{msg.text}</Text>
                    </View>
                    <Text style={chatStyles.time}>{msg.time}</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
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
        <ScrollView>
          {ADMIN_DMS.map(dm => (
            <TouchableOpacity key={dm.id} style={dmListStyles.item} onPress={() => openDM(dm.id)}>
              <View style={[dmListStyles.avatar, { backgroundColor: dm.color }]}>
                <Text style={dmListStyles.avatarText}>{dm.initials}</Text>
                {dm.unread > 0 && <View style={dmListStyles.unreadDot} />}
              </View>
              <View style={dmListStyles.info}>
                <Text style={dmListStyles.name}>{dm.name}</Text>
                <Text style={dmListStyles.preview} numberOfLines={1}>{dm.preview}</Text>
              </View>
              <View style={dmListStyles.meta}>
                <Text style={dmListStyles.time}>{dm.time}</Text>
                {dm.unread > 0 && (
                  <View style={dmListStyles.badge}>
                    <Text style={dmListStyles.badgeText}>{dm.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {chatTab === 'dms' && activeDM && (
        <>
          <View style={chatStyles.convHeader}>
            <TouchableOpacity onPress={() => setActiveDM(null)}>
              <Text style={chatStyles.backBtn}>‹</Text>
            </TouchableOpacity>
            {(() => {
              const dm = ADMIN_DMS.find(d => d.id === activeDM)!;
              return (
                <>
                  <View style={[chatStyles.convAvatar, { backgroundColor: dm.color }]}>
                    <Text style={chatStyles.convAvatarText}>{dm.initials}</Text>
                  </View>
                  <View>
                    <Text style={chatStyles.convName}>{dm.name}</Text>
                    <Text style={chatStyles.convSub}>Atleta</Text>
                  </View>
                </>
              );
            })()}
          </View>
          <ScrollView style={chatStyles.msgList} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {(dmMsgs[activeDM] || []).map(msg => (
              <View key={msg.id} style={[chatStyles.msgRow, msg.mine ? chatStyles.msgMine : chatStyles.msgTheirs]}>
                <View style={[chatStyles.bubble, msg.mine ? chatStyles.bubbleMine : chatStyles.bubbleTheirs]}>
                  <Text style={[chatStyles.bubbleText, msg.mine && chatStyles.bubbleTextMine]}>{msg.text}</Text>
                </View>
                <Text style={chatStyles.time}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={chatStyles.inputBar}>
            <TextInput
              style={chatStyles.input}
              placeholder="Responder..."
              placeholderTextColor={Colors.muted}
              value={dmInput}
              onChangeText={setDmInput}
              onSubmitEditing={sendAdminDM}
              returnKeyType="send"
            />
            <TouchableOpacity style={chatStyles.sendBtn} onPress={sendAdminDM}>
              <Text style={chatStyles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

function NuevaClasePanel({ showToast }: { showToast: (m: string, t: any) => void }) {
  return (
    <ScrollView style={panelStyles.panel} contentContainerStyle={panelStyles.content}>
      <View style={nuevaStyles.card}>
        <FormField label="Tipo de clase" input={
          <View style={nuevaStyles.fakeSelect}><Text style={nuevaStyles.fakeSelectText}>WOD CrossFit</Text></View>
        } />
        <View style={nuevaStyles.row}>
          <View style={nuevaStyles.half}>
            <FormField label="Hora inicio" input={
              <TextInput style={[nuevaStyles.input, { color: Colors.white }]} defaultValue="07:00" placeholderTextColor={Colors.muted} />
            } />
          </View>
          <View style={nuevaStyles.half}>
            <FormField label="Duración" input={
              <View style={nuevaStyles.fakeSelect}><Text style={nuevaStyles.fakeSelectText}>60 min</Text></View>
            } />
          </View>
        </View>
        <FormField label="Coach" input={
          <View style={nuevaStyles.fakeSelect}><Text style={nuevaStyles.fakeSelectText}>Sara Martínez</Text></View>
        } />
        <View style={nuevaStyles.row}>
          <View style={nuevaStyles.half}>
            <FormField label="Plazas máx." input={
              <TextInput style={[nuevaStyles.input, { color: Colors.white }]} defaultValue="16" keyboardType="numeric" placeholderTextColor={Colors.muted} />
            } />
          </View>
          <View style={nuevaStyles.half}>
            <FormField label="Repetir" input={
              <View style={nuevaStyles.fakeSelect}><Text style={nuevaStyles.fakeSelectText}>Solo hoy</Text></View>
            } />
          </View>
        </View>
        <FormField label="WOD (opcional)" input={
          <TextInput
            style={[nuevaStyles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10, color: Colors.white }]}
            placeholder="Describe el entrenamiento..."
            placeholderTextColor={Colors.muted}
            multiline
          />
        } />
        <TouchableOpacity style={nuevaStyles.createBtn} onPress={() => showToast('✅ Clase creada', 'success')}>
          <Text style={nuevaStyles.createBtnText}>Crear clase</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  flex: { flex: 1 },
  adminHeader: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: 16,
    paddingHorizontal: 20,
  },
  adminTitle: { fontFamily: Fonts.headingXBold, fontSize: 26, color: Colors.white },
  adminSub: { color: Colors.muted, fontSize: 13, fontFamily: Fonts.body, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  tabScroll: { flexGrow: 0 },
  tabContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 4, flexDirection: 'row' },
  adminTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  adminTabActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  adminTabText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.muted },
  adminTabTextActive: { color: '#fff' },
});

const statStyles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
  },
  label: { fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontFamily: Fonts.body },
  value: { fontFamily: Fonts.headingXBold, lineHeight: 36 },
  sub: { fontSize: 11, marginTop: 4, fontFamily: Fonts.body },
});

const panelStyles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, paddingTop: 0 },
  sectionHeader: { paddingVertical: 12 },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: Colors.muted,
  },
});

const clsStyles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 3 },
  meta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  bar: { height: 4, backgroundColor: Colors.surface3, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtn: { backgroundColor: Colors.orangeGlow, borderColor: Colors.orange },
});

const memStyles = StyleSheet.create({
  search: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    color: Colors.white,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
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
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 16, color: '#fff' },
  info: { flex: 1 },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 2 },
  plan: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  addBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 13 },
});

const cobroStyles = StyleSheet.create({
  pendingBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.yellow,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  pendingTitle: { fontSize: 12, color: Colors.yellow, fontFamily: Fonts.bodySemiBold, marginBottom: 8 },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  pendingRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  pendingName: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.white },
  pendingPlan: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  pendingAmount: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white },
  avisarBtn: {
    backgroundColor: Colors.orangeGlow,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  avisarText: { fontSize: 12, color: Colors.orange, fontFamily: Fonts.bodySemiBold },
});

const invRowStyles = StyleSheet.create({
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

const factStyles = StyleSheet.create({
  diffBox: {
    backgroundColor: Colors.orangeGlow,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  diffTitle: { color: Colors.orange, fontFamily: Fonts.bodySemiBold, fontSize: 13, marginBottom: 4 },
  diffSub: { color: Colors.muted, fontSize: 12, fontFamily: Fonts.body },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: { flex: 1, padding: 8, borderRadius: 6, alignItems: 'center' },
  btnPrimary: { backgroundColor: Colors.orange },
  btnPrimaryText: { fontFamily: Fonts.bodySemiBold, color: '#fff', fontSize: 12 },
  btnSecondary: { backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border },
  btnSecondaryText: { fontFamily: Fonts.bodySemiBold, color: Colors.white, fontSize: 12 },
  pdfBtn: {
    backgroundColor: Colors.orangeGlow,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  pdfBtnText: { fontSize: 12, color: Colors.orange, fontFamily: Fonts.bodySemiBold },
  footer: { textAlign: 'center', color: Colors.muted, fontSize: 12, fontFamily: Fonts.body, marginTop: 8 },
});

const nuevaStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 0,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  fakeSelect: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
  },
  fakeSelectText: { color: Colors.white, fontFamily: Fonts.body, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  createBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
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
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.white,
    fontFamily: Fonts.body,
    fontSize: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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

const dmListStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.headingXBold, fontSize: 17, color: '#fff' },
  unreadDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.orange, borderWidth: 2, borderColor: Colors.black },
  info: { flex: 1, overflow: 'hidden' },
  name: { fontFamily: Fonts.bodySemiBold, fontSize: 14, color: Colors.white, marginBottom: 2 },
  preview: { fontSize: 12, color: Colors.muted, fontFamily: Fonts.body },
  meta: { alignItems: 'flex-end' },
  time: { fontSize: 11, color: Colors.muted, fontFamily: Fonts.body },
  badge: { backgroundColor: Colors.orange, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  badgeText: { fontSize: 10, fontFamily: Fonts.bodySemiBold, color: '#fff' },
});
